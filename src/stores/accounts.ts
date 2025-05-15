import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '@/api/accounts'
import type { Account } from '@/types/accounts'
import { toast } from 'vue-sonner'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])

  const load = async () => {
    try {
      const { data } = await api.GET_ACCOUNTS()
      accounts.value = data
    } catch (err) {
      console.error('Ошибка при загрузке аккаунтов:', err)
    }
  }

  const add = async (account: Account): Promise<Account | null> => {
    try {
      const { data } = await api.ADD_ACCOUNTS(account)
      accounts.value.push(data)

      toast('Успешно добавлено', {
        description: 'Аккаунт добавлен !',
      })

      return data
    } catch (err) {
      console.error('Ошибка при добавлении аккаунта:', err)
      toast('Ошибка', {
        description: 'Не удалось добавить аккаунт',
      })
      return null
    }
  }

  const update = async (account: Account) => {
    try {
      await api.UPDATE_ACCOUNTS(account)
      const index = accounts.value.findIndex(a => a.id === account.id)
      if (index !== -1) accounts.value[index] = account

      toast('Успешно изменено', {
        description: 'Данные аккаунта обновлены !',
      })
    } catch (err) {
      console.error('Ошибка при обновлении аккаунта:', err)
      toast('Ошибка', {
        description: 'Не удалось обновить аккаунт',
      })
    }
  }

  const removeAccount = async (id: string) => {
    try {
      await api.DELETE_ACCOUNTS(id)
      accounts.value = accounts.value.filter(a => a.id !== id)

      toast('Успешно удалено', {
        description: 'Аккаунт удалён !',
      })
    } catch (err) {
      console.error('Ошибка при удалении аккаунта:', err)
      toast('Ошибка', {
        description: 'Не удалось удалить аккаунт',
      })
    }
  }

  return {
    accounts,
    load,
    add,
    update,
    removeAccount,
  }
})
