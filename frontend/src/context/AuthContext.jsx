import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load from localStorage when app starts
  useEffect(() => {

    const storedUser = localStorage.getItem("learnpulse_user")

    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    setLoading(false)

  }, [])

  // LOGIN
  const login = (userData) => {

    /*
      userData example:
      {
        uid: "abc123",
        email: "teacher@gmail.com",
        role: "teacher"
      }
    */

    setUser(userData)

    localStorage.setItem(
      "learnpulse_user",
      JSON.stringify(userData)
    )
  }

  // LOGOUT
  const logout = () => {

    setUser(null)

    localStorage.removeItem("learnpulse_user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )

}

export const useAuth = () => useContext(AuthContext)