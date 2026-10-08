import Header from './components/Header/Header.tsx'
import Footer from './components/Footer/Footer.tsx'
import { Outlet } from 'react-router-dom'

function Layout() {

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 text-gray-900">
      {<Header />} 
      <main className="flex-1 bg-transparent">
        <Outlet />
      </main>
      {<Footer />}
    </div>
  );
}

export default Layout