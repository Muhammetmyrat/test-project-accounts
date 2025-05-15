import axios from 'axios'
import type { Account } from '@/types/accounts'

const API_URL = import.meta.env.VITE_API_URL

export const GET_ACCOUNTS = () => axios.get<Account[]>(`${API_URL}/accounts`)

export const ADD_ACCOUNTS = (account: Account) =>
  axios.post(`${API_URL}/accounts`, account)

export const UPDATE_ACCOUNTS = (account: Account) =>
  axios.put(`${API_URL}/accounts/${account.id}`, account)

export const DELETE_ACCOUNTS = (id: string) =>
  axios.delete(`${API_URL}/accounts/${id}`)
