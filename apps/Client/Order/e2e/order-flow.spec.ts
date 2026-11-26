import { expect, Page, test } from '@playwright/test';
import { installMockBackend } from './mock-backend';

type PurchaseOptions = {
  studentAllowed: boolean;
  studentLoggedIn: boolean;
  email: string;
  password?: string;
  buyStudentTicket?: boolean;
  useTableSelection?: boolean;
};

async function bootstrapE2E(page: Page, studentLoggedIn: boolean, studentAllowed: boolean) {
  await page.addInitScript(
    ({ loggedIn, allowed }) => {
      window.localStorage.setItem('__e2e', 'true');
      window.localStorage.setItem('__e2e_student_allowed', allowed ? 'true' : 'false');
      document.cookie = '__session=e2e-session; path=/';
      if (loggedIn) {
        window.localStorage.setItem('__e2e_student_logged_in', 'true');
      } else {
        window.localStorage.removeItem('__e2e_student_logged_in');
      }
    },
    { loggedIn: studentLoggedIn, allowed: studentAllowed }
  );

  await installMockBackend(page, { studentAllowed });
  await page.goto('/?e2e=true');
  await expect(page.getByRole('heading', { name: 'Ticketauswahl' })).toBeVisible();
}

async function seedDigitalTicket(page: Page, type: 'EXTERNAL' | 'STUDENT') {
  const price = type === 'STUDENT' ? 25 : 35;
  await page.evaluate(({ ticketType, ticketPrice }) => {
    const seededTickets = [{ id: '', type: ticketType, price: ticketPrice, isPhysical: false }];
    window.localStorage.setItem('tickets', JSON.stringify(seededTickets));
    const fallbackSeats = [
      {
        id: 'seed-seat-1',
        price: 12,
        table: 'Seed',
        xposition: 0,
        yposition: 0,
        xlength: 10,
        ylength: 10,
      },
    ];
    window.sessionStorage.setItem('seats', JSON.stringify(fallbackSeats));
  }, { ticketType: type, ticketPrice: price });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ticketauswahl' })).toBeVisible();
}

async function pickTable(page: Page) {
  const canvas = page.locator('#tablesCanvas');
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 120, y: 120 } });
  await expect(page.getByText('A1 - 2x')).toBeVisible();
}

async function fillPersonalData(page: Page, options: PurchaseOptions) {
  await page.evaluate(({ email, password, studentLoggedIn }) => {
    const personalInfo = {
      firstName: studentLoggedIn ? 'Test' : 'Max',
      lastName: studentLoggedIn ? 'Student' : 'Mustermann',
      mailAddress: email,
      password: studentLoggedIn ? undefined : (password ?? 'StrongPass123!'),
      phoneNumber: '06641234567',
      schoolClass: '',
      isMale: true,
      street: 'Musterstrasse',
      streetNumber: '7',
      zipCode: '4020',
      town: 'Linz',
    };
    window.localStorage.setItem('personalInfo', JSON.stringify(personalInfo));
  }, {
    email: options.email,
    password: options.password,
    studentLoggedIn: options.studentLoggedIn,
  });

  await page.evaluate(async () => {
    const e2eWindow = window as Window & {
      __e2eNavigate?: (url: string) => Promise<boolean>;
    };
    await e2eWindow.__e2eNavigate?.('/summary');
  });
  await expect(page).toHaveURL(/\/summary$/);
}

async function submitOrder(page: Page) {
  await page.getByTestId('summary-terms-checkbox').check();
  await page.getByTestId('summary-submit-order').click();
  await expect(page).toHaveURL(/\/confirmation$/);
  await expect(page.getByText(/Vielen Dank/)).toBeVisible();
}

async function completePurchase(page: Page, options: PurchaseOptions) {
  await bootstrapE2E(page, options.studentLoggedIn, options.studentAllowed);

  if (options.buyStudentTicket) {
    await seedDigitalTicket(page, 'STUDENT');
  } else {
    await seedDigitalTicket(page, 'EXTERNAL');
  }

  if (options.useTableSelection) {
    await pickTable(page);
  }

  await fillPersonalData(page, options);
  await submitOrder(page);
}

test('Buying a prom ticket as a non student', async ({ page }) => {
  await completePurchase(page, {
    studentAllowed: false,
    studentLoggedIn: false,
    email: 'nonstudent.e2e@ticket.local',
    password: 'StrongPass123!',
  });

  await expect(page.getByText('Standardeintritt')).toBeVisible();
});

test('Buying a prom ticket as a student', async ({ page }) => {
  await completePurchase(page, {
    studentAllowed: true,
    studentLoggedIn: true,
    email: 'student.e2e@ticket.local',
    buyStudentTicket: true,
  });

  await expect(page.getByText('Schuelerermassigung').or(page.getByText('Schülerermäßigung'))).toBeVisible();
});

test('Buying a prom ticket with table selection on the table selector', async ({ page }) => {
  await completePurchase(page, {
    studentAllowed: false,
    studentLoggedIn: false,
    email: 'tables.e2e@ticket.local',
    password: 'StrongPass123!',
    useTableSelection: true,
  });

  await expect(page.getByText('Tisch A1 - 2 Plaetze').or(page.getByText('Tisch A1 - 2 Plätze'))).toBeVisible();
});

test('Checking on the orders list page whether the orders made have actually persisted', async ({ page }) => {
  await completePurchase(page, {
    studentAllowed: true,
    studentLoggedIn: true,
    email: 'student.e2e@ticket.local',
    buyStudentTicket: true,
  });

  await page.evaluate(async () => {
    const e2eWindow = window as Window & {
      __e2eNavigate?: (url: string) => Promise<boolean>;
    };
    await e2eWindow.__e2eNavigate?.('/orders');
  });
  await expect(page).toHaveURL(/\/orders$/);

  await page.getByTestId('orders-student-login').click();
  await expect(page.getByTestId('order-card')).toHaveCount(1);
  await expect(page.getByText('1 Tickets')).toBeVisible();
});






















