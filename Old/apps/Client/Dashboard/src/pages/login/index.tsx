import Login from "@/components/auth/Login"

function Auth() {
  return (
    <div className="flex flex-col items-center justify-evenly h-screen">
      <div className="flex flex-col items-center justify-center gap-2">
        <h1 className='text-4xl font-bold'>Willkommen bei Ballkoenig <span className="text-primary-500">v2</span></h1>
        <h2 className="text-text-500 dark:text-text-400">Ballkartenmanagement der HTBLA-Leonding</h2>
      </div>
      <div className="flex flex-col items-center justify-center gap-2">
        <Login />
      </div>
    </div>
  )
}

export default Auth