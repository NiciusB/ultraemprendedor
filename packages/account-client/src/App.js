import React, { useState, useEffect } from 'react'
import LoggedInRouter from './routers/LoggedInRouter'
import { accountData, loadAcountDataFromStorage } from './lib/user'
import LoginRouter from './routers/LoginRouter'
import ErrorBoundary from './components/ErrorBoundary'

export function reloadApp() {
  staticReloadApp()
}
let staticReloadApp = () => {}

function App() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  staticReloadApp = () => setLoading(true)

  useEffect(() => {
    if (!loading) return

    loadAcountDataFromStorage()
      .then(() => {
        setLoading(false)
        setLoggedIn(Boolean(accountData))
      })
      .catch(() => {
        setLoading(false)
        setLoggedIn(false)
      })
  }, [loading])

  if (loading) return null

  return <ErrorBoundary>{loggedIn ? <LoggedInRouter /> : <LoginRouter />}</ErrorBoundary>
}

export default App
