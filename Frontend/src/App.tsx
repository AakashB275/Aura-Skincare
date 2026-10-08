import './App.css'
import { Route, Routes } from 'react-router-dom'
import Layout from './layout.tsx'
import LandingPage from './LandingPage'
import SupportPage from './components/Support/SupportPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route
          path="home"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
