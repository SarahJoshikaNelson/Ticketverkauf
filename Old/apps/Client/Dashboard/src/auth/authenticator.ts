import { useKeycloak } from "@react-keycloak/web"
import authFetch from "@/utils/authfetch"

class Authenticator {
    public async isAuthenticated(): Promise<boolean> {
        const {keycloak} = useKeycloak()
        // @ts-ignore
        const apiUrl = import.meta.env.VITE_API_Q_URL as string

        if(keycloak.authenticated) {
            const name = keycloak.tokenParsed?.preferred_username

            if(name) {
                const response = await authFetch(`${apiUrl}api/v2/admin/access`, keycloak.token)

                if(response.ok) {
                    return true
                }
            }
        }
        else {
            const response = await authFetch(`${apiUrl}api/v2/admin/access`, undefined)

            if(response.ok) {
                return true
            }
        }

        return false
    }

    public async sendRequest(url: string, method: string, body: any) {
        const {keycloak} = useKeycloak()

        const response = await fetch(url, {
            method: method,
            body: body,
            headers: {
                'Authorization': `Bearer ${keycloak.token}`
            }
        })

        return response
    }
}

const authenticator = new Authenticator()

export default authenticator