type LoginOptions = {
  redirectUri?: string;
};

type E2EProfile = {
  firstName: string;
  lastName: string;
  email: string;
};

export class E2EKeycloakService {
  private readonly storageKey = '__e2e_student_logged_in';

  private readonly profile: E2EProfile = {
	firstName: 'Test',
	lastName: 'Student',
	email: 'student.e2e@ticket.local',
  };

  async init(): Promise<boolean> {
	return true;
  }

  isLoggedIn(): boolean {
	return window.localStorage.getItem(this.storageKey) === 'true';
  }

  async loadUserProfile(): Promise<E2EProfile> {
	return this.profile;
  }

  async login(options?: LoginOptions): Promise<void> {
	window.localStorage.setItem(this.storageKey, 'true');
	if (options?.redirectUri) {
	  window.location.href = options.redirectUri;
	}
  }

  async logout(redirectUri?: string): Promise<void> {
	window.localStorage.removeItem(this.storageKey);
	if (redirectUri) {
	  window.location.href = redirectUri;
	}
  }

  getKeycloakInstance() {
	return {
	  profile: this.profile,
	  loadUserProfile: async () => this.profile,
	};
  }
}

