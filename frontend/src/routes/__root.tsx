import NavBar from '@/components/common/NavBar'
import { useAuthContext } from '@/context/AuthContext'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => {
    const { loading } = useAuthContext()
    
    if(loading) return null

    return (
      <>
        <div className="bg-amber-100 text-amber-900 text-center text-sm py-1.5 px-4">
          Demo project: campaigns and donations are mock data, and payments run in test mode, so no real money is charged.
        </div>
        <NavBar />
        <Outlet />
      </>
    )
  },
})