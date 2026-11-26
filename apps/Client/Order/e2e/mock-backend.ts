import { Page, Route } from '@playwright/test';

type MockOptions = {
  studentAllowed?: boolean;
};

type TicketType = 'STUDENT' | 'EXTERNAL' | 'GRADUATE';

type MockOrder = {
  id: string;
  customer: {
    firstName: string;
    lastName: string;
    mailAddress: string;
    phoneNumber: string;
    schoolClass: string;
    isMale: boolean;
    street: string;
    streetNumber: string;
    zipCode: string;
    town: string;
  };
  order: {
    status: string;
    orderDate: string;
    tickets: Array<{ id: string; type: TicketType; price: number; isPhysical?: boolean }>;
    seats: Array<{
      id: string;
      price: number;
      table: string;
      xposition: number;
      yposition: number;
      xlength: number;
      ylength: number;
    }>;
  };
};

const TABLE_LAYER_FIXTURE = [
  {
    name: 'Saal',
    level: 1,
    picture: '',
    rooms: [
      {
        name: 'Room A',
        xposition: 0,
        yposition: 0,
        xlength: 800,
        ylength: 600,
        tables: [
          {
            name: 'A1',
            selectable: true,
            xposition: 120,
            yposition: 120,
            xlength: 120,
            ylength: 90,
            seats: [
              {
                id: 'seat-a1-1',
                price: 15,
                xposition: 130,
                yposition: 130,
                xlength: 16,
                ylength: 16,
                taken: false,
              },
              {
                id: 'seat-a1-2',
                price: 15,
                xposition: 160,
                yposition: 130,
                xlength: 16,
                ylength: 16,
                taken: false,
              },
            ],
          },
        ],
      },
    ],
  },
];

export async function installMockBackend(page: Page, options: MockOptions = {}) {
  const studentAllowed = options.studentAllowed ?? false;
  const studentPrice = 25;
  const externalPrice = 35;
  const physicalSurcharge = 3;

  const ordersByEmail = new Map<string, MockOrder[]>();
  const tokenByEmail = new Map<string, string>();
  let orderCounter = 0;

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const { pathname } = requestUrl;

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (pathname.endsWith('/v2/reservation/allowed')) {
      return json(true);
    }

    if (pathname.includes('/v2/waiting/') && pathname.endsWith('/pass')) {
      return route.fulfill({ status: 200, body: '' });
    }

    if (pathname.endsWith('/v2/ticket/student')) {
      return json(studentPrice);
    }

    if (pathname.endsWith('/v2/ticket/extern')) {
      return json(externalPrice);
    }

    if (pathname.endsWith('/v2/ticket/count')) {
      return json(1700);
    }

    if (pathname.endsWith('/v2/ticket/count-per-order')) {
      return json(25);
    }

    if (pathname.endsWith('/v2/ticket/student/allowed')) {
      return json(studentAllowed);
    }

    if (pathname.endsWith('/v2/ticket/graduate/allowed')) {
      return json(false);
    }

    if (pathname.endsWith('/v2/ticket/physical/additional-charge')) {
      return json({ additionalChargeForPhysicalTicket: physicalSurcharge });
    }

    if (pathname.endsWith('/v2/reservation/booked-tickets')) {
      return json(300);
    }

    if (pathname.endsWith('/v2/reservation/layers')) {
      return json(TABLE_LAYER_FIXTURE);
    }

    if (pathname.endsWith('/v2/user/login') && request.method() === 'POST') {
      const payload = request.postDataJSON() as { email: string };
      const token = `token-${payload.email}`;
      tokenByEmail.set(payload.email, token);
      return json({ token });
    }

    if (pathname.endsWith('/v2/user/register') && request.method() === 'POST') {
      return route.fulfill({ status: 201, body: 'registered' });
    }

    if (pathname.endsWith('/v2/reservation/bookOrder') && request.method() === 'POST') {
      const payload = request.postDataJSON() as {
        customer: MockOrder['customer'];
        tickets: MockOrder['order']['tickets'];
        seats?: MockOrder['order']['seats'];
      };

      orderCounter += 1;
      const order: MockOrder = {
        id: `e2e-order-${orderCounter}`,
        customer: payload.customer,
        order: {
          status: 'WAITING',
          orderDate: new Date().toISOString(),
          tickets: payload.tickets ?? [],
          seats: payload.seats ?? [],
        },
      };

      const existingOrders = ordersByEmail.get(payload.customer.mailAddress) ?? [];
      existingOrders.push(order);
      ordersByEmail.set(payload.customer.mailAddress, existingOrders);

      return json(payload.tickets ?? []);
    }

    if (pathname.includes('/v2/order/all/')) {
      const parts = pathname.split('/');
      const token = parts[parts.length - 1];
      const email = decodeURIComponent(parts[parts.length - 2]);
      const expectedToken = tokenByEmail.get(email);

      if (token === 'null') {
        return json(ordersByEmail.get(email) ?? []);
      }

      if (expectedToken && expectedToken === token) {
        return json(ordersByEmail.get(email) ?? []);
      }

      return json([]);
    }

    if (pathname.includes('/v2/waiting/') && request.method() === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }

    return route.continue();
  });
}


