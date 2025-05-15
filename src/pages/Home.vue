<script setup lang="ts">
// Импортируем необходимые хуки и типы из vee-validate и zod
import { onMounted, ref } from 'vue'
import { useForm, useFieldArray } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'

// Импорт Pinia-хранилища для работы с аккаунтами
import { useAccountsStore } from '@/stores/accounts'
import { storeToRefs } from 'pinia'

// Импорт UI компонентов
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, AlertCircle, Trash, Eye, EyeOff } from 'lucide-vue-next'

import ConfirmDialog from '@/components/ConfirmDialog.vue'

// Импорт типа аккаунта
import type { Account, AccountType } from '@/types/accounts'

// Инициализируем Pinia-хранилище
const store = useAccountsStore()

const { accounts } = storeToRefs(store)
const { load, add, update, removeAccount } = store

// Переключатель для отображения пароля
const isTypePasswordMap = ref<Record<number, boolean>>({})

// Переменные для управления состоянием диалогового окна подтверждения
const isConfirmOpen = ref<boolean>(false)
const selectedAccountIndex = ref<number>(0)

// Описание схемы валидации аккаунта с использованием zod
const accountSchema = z
  .object({
    id: z.string().optional(),
    labels: z.string().max(50).optional(),
    type: z.enum(['local', 'ldap']),
    login: z
      .string({ required_error: 'Обязательное поле' })
      .min(1, 'Обязательное поле')
      .max(100, 'Максимум 100 символов'),
    password: z.string().max(100, 'Максимум 100 символов').nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'local') {
      if (!data.password || data.password.trim() === '') {
        ctx.addIssue({
          path: ['password'],
          code: z.ZodIssueCode.custom,
          message: 'Обязательное поле',
        })
      }
    }
  })

// Основная форма с массивом аккаунтов
const { resetForm, values, setFieldValue } = useForm({
  validationSchema: toTypedSchema(
    z.object({ accounts: z.array(accountSchema) })
  ),
  initialValues: { accounts: [] },
})

// Хук управления массивом аккаунтов
const { fields, push, remove } = useFieldArray('accounts')

// При монтировании компонента загружаем аккаунты из хранилища и устанавливаем их в форму
onMounted(async () => {
  await load()
  resetForm({
    values: {
      accounts: accounts.value.map((account: Account) => ({
        ...account,
        labels: account.labels?.map(l => l.text).join(';'), // Преобразуем метки в строку
      })),
    },
  })
})

// Вспомогательная функция для преобразования строки меток в массив
const parseLabels = (labels?: string) =>
  labels
    ?.split(';')
    .map(l => ({ text: l }))
    .filter(l => l.text) ?? []

// Обработчик события потери фокуса — сохраняем или обновляем аккаунт
const handleBlur = async (index: number) => {
  const account = values.accounts?.[index]
  if (!account) return

  const parsed = accountSchema.safeParse(account)
  if (!parsed.success) return

  const transformed: Account = {
    ...account,
    labels: parseLabels(account.labels),
    password: account.type === 'ldap' ? null : account.password,
  }

  if (account.id) {
    await update({ ...transformed, id: account.id })
  } else {
    const created = await add(transformed)
    if (created && created.labels) {
      setFieldValue(`accounts.${index}`, {
        ...created,
        type: created.type || 'local',
        labels: created.labels.map(l => l.text).join(';'),
      })
    }
  }
}

// Обработчик удаления аккаунта
const handleRemove = async (index: number) => {
  isConfirmOpen.value = true
  selectedAccountIndex.value = index
}

const handleConfirm = async () => {
  const account = values.accounts?.[selectedAccountIndex.value]
  if (account?.id) {
    await removeAccount(account.id)
  }
  remove(selectedAccountIndex.value)
}

const handleClose = () => {
  isConfirmOpen.value = false
}

// Добавление нового аккаунта
const handleAdd = () => {
  push({ type: 'local', login: '', password: '', labels: '' })
}
</script>

<template>
  <div class="h-full w-full flex items-start justify-center">
    <div class="max-w-5xl w-full flex flex-col gap-4 p-4">
      <div class="flex items-center gap-2 mt-10">
        <span class="text-lg font-semibold">Учетные записи</span>
        <Button variant="outline" size="icon" @click="handleAdd">
          <Plus class="w-4 h-4" />
        </Button>
      </div>

      <Alert variant="default">
        <AlertCircle class="w-4 h-4" />
        <AlertDescription>
          Для указания нескольких меток используйте разделитель `;`
        </AlertDescription>
      </Alert>

      <div
        class="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground"
      >
        <span>Метки</span>
        <span>Тип записи</span>
        <span>Логин</span>
        <span
          v-if="
            !values?.accounts?.length
              ? true
              : values?.accounts?.some(a => a.type === 'local')
          "
          >Пароль</span
        >
        <span></span>
      </div>

      <div
        v-for="(field, index) in fields"
        :key="field.key"
        class="grid grid-cols-5 gap-2 items-start"
      >
        <FormField
          :name="`accounts[${index}].labels`"
          v-slot="{ componentField }"
        >
          <FormItem>
            <FormControl>
              <Input
                type="text"
                autocomplete="off"
                placeholder="Метка"
                v-bind="componentField"
                @input="
                    (e: Event) => {
                      const target = e.target as HTMLInputElement
                      const upper: string = target.value.toUpperCase()
                      setFieldValue(`accounts.${index}.labels`, upper)
                    }
                "
                @blur="handleBlur(index)"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField :name="`accounts[${index}].type`">
          <FormItem>
            <FormControl>
              <Select
                :modelValue="values.accounts?.[index]?.type ?? ''"
                @update:modelValue="
                  val => {
                    if (val) {
                      setFieldValue(`accounts.${index}.type` as const, val as AccountType)
                    }
                    handleBlur(index)
                  }
                "
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Локальная</SelectItem>
                  <SelectItem value="ldap">LDAP</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField
          :name="`accounts[${index}].login`"
          v-slot="{ componentField }"
        >
          <FormItem>
            <FormControl>
              <Input
                type="text"
                autocomplete="off"
                placeholder="Логин"
                v-bind="componentField"
                @blur="handleBlur(index)"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField
          :name="`accounts[${index}].password`"
          v-slot="{ componentField }"
        >
          <FormItem v-if="values.accounts?.[index]?.type === 'local'">
            <FormControl>
              <div class="relative w-full max-w-sm items-center">
                <Input
                  id="password"
                  :type="isTypePasswordMap[index] ? 'text' : 'password'"
                  autocomplete="off"
                  placeholder="Пароль"
                  class="pr-8"
                  v-bind="componentField"
                  @blur="handleBlur(index)"
                />
                <span
                  class="absolute end-0 inset-y-0 flex items-center justify-center px-2"
                  @click="isTypePasswordMap[index] = !isTypePasswordMap[index]"
                >
                  <component
                    :is="isTypePasswordMap[index] ? Eye : EyeOff"
                    class="size-4 text-muted-foreground"
                  />
                </span>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button variant="outline" size="icon" @click="handleRemove(index)">
          <Trash class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>

  <ConfirmDialog
    :open="isConfirmOpen"
    description="Это действие необратимо. Аккаунт будет безвозвратно удалён вместе со всеми данными."
    @confirm="handleConfirm"
    @close="handleClose"
  />
</template>
