import { Customer } from "@ticket-system/models";


function DataTable({ customer }: { customer: Customer }) {
    return (
        <div className="flex flex-col gap-2 w-full bg-background-700 dark:bg-background-200 border border-background-100 dark:border-background-300 rounded-lg p-4">
            <h2 className="text-lg font-bold">{customer.firstName} {customer.lastName}</h2>
            <p className="text-sm dark:text-text-600 font-medium text-text-300">{customer.phoneNumber}</p>
            <p className="text-sm dark:text-text-600 font-medium text-text-300">{customer.mailAddress}</p>
            <p className="text-sm dark:text-text-600 font-medium text-text-300">{customer.street} {customer.streetNumber} / {customer.zipCode} {customer.town}</p>
        </div>
    )
} 

export default DataTable;