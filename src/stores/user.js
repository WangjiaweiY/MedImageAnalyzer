// src/stores/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    username: localStorage.getItem('username') || '',
    token: localStorage.getItem('token') || '',
    isLoggedIn: !!localStorage.getItem('token')
  }),
  actions: {
    setUserData({ username, token }) {
      this.username = username
      this.token = token
      this.isLoggedIn = true
      localStorage.setItem('username', username)
      localStorage.setItem('token', token)
    },
    clearUserData() {
      this.username = ''
      this.token = ''
      this.isLoggedIn = false
      localStorage.removeItem('username')
      localStorage.removeItem('token')
    },
    getAuthHeader() {
      return this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
    }
  }
})
