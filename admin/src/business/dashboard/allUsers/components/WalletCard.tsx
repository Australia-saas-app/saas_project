'use client'
import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/src/shared/ui/ui/card'
import { Button } from '@/src/shared/ui/ui/button'
import { Table, TableHeading, TableBody, TableRow, TableColumn } from '@/src/shared/ui/table'
import TabButton from '@/src/shared/ui/ui/TabButton'
import { SearchInput } from '@/src/shared/ui/form/search-input'
import { Pagination } from '@/src/shared/ui/ui/pagination'
import { CreditCard, HandCoins, MoveDown,  Plus, Trash } from 'lucide-react'
import Image from 'next/image'

type TableItem = {
  id: string
  method?: string
  amount?: string
  date?: string
  status?: string
}

const demoStats = [
  { label: 'Total Project', value: 250 },
  { label: 'Pending Project', value: 140 },
  { label: 'Successful Projects', value: 10 },
  { label: 'Cancel Projects', value: 100 },
]

const demoTransactions = [
  { id: 'tx-1', method: 'Stripe', amount: '6 INR', date: '03 Feb 2025, 2:05 PM (UTC)', status: 'Complete' },
  { id: 'tx-2', method: 'PayPal', amount: '8 INR', date: '02 Feb 2025, 12:30 PM (UTC)', status: 'Complete' },
  { id: 'tx-3', method: 'Stripe', amount: '12 INR', date: '01 Feb 2025, 9:12 AM (UTC)', status: 'Pending' },
]

const demoWithdrawals = [
  { id: 'wd-1', method: 'Bank Transfer', amount: '50 USD', date: '05 Feb 2025, 1:00 PM (UTC)', status: 'Processing' },
  { id: 'wd-2', method: 'PayPal', amount: '30 USD', date: '02 Feb 2025, 11:20 AM (UTC)', status: 'Complete' },
]

// demoProjects removed — not used in simplified dashboard

interface WalletCardProps {
  userId: string
}



export const WalletCard: React.FC<WalletCardProps> = ({ userId }) => {
  const [activeMainTab, setActiveMainTab] = useState<'deposit' | 'withdrawal' | 'payment' | 'refund'>('deposit')
  const [txQuery, setTxQuery] = useState('')
  const [search, setSearch] = useState("")

  // Pagination state
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  // compute filtered dataset based on active tab and query
  const getCurrentData = () => {
    if (activeMainTab === 'deposit' || activeMainTab === 'payment') {
      return demoTransactions.filter(t => t.id.includes(txQuery || ''))
    }

    if (activeMainTab === 'withdrawal' || activeMainTab === 'refund') {
      return demoWithdrawals.filter(w => w.id.includes(txQuery || ''))
    }

    return []
  }

  const filtered = getCurrentData()
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // reset page when tab or query changes
  React.useEffect(() => {
    setPage(1)
  }, [activeMainTab, txQuery])

  return (
    <div className="p-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

        {/* Right: Payment methods */}
        <div className='bg-base-100 rounded-lg shadow border p-6 h-full flex flex-col gap-4'>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
              <div className="flex items-center gap-4">
                <HandCoins />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Current Balance</h4>
                </div>
              </div>
              <p className="text-3xl  font-bold text-gray-900 dark:text-white flex items-baseline">
                $4,523,466.98
                <sub className="text-sm ml-3 text-gray-500 dark:text-slate-400">USD</sub>
              </p>

            </div>

            <div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
                <div className="flex items-center gap-4">
                  <MoveDown />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Money-in</h4>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">$3,053,450.98</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
                <div className="flex items-center gap-4">
                  <MoveDown />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Money-out</h4>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">$3,053,450.98</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
                <div className="flex items-center gap-4">
                  <MoveDown />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Refund-in</h4>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">$3,053,450.98</p>
              </div>

            </div>

          </div>
        </div>

        {/* Middle: Payment methods */}
        <div className="bg-base-100 rounded-lg shadow border p-6 h-full flex flex-col">
          <div className='grid grid-cols-3 gap-2 mb-5'>
            <Button variant="ghost" className="flex flex-col hover:bg-white hover:text-primary bg-white py-10 shadow rounded-lg items-center space-x-2 px-3">
              <Plus />
              <span>Add Money</span>
            </Button>
            <Button variant="ghost" className="flex flex-col hover:bg-white hover:text-primary bg-white py-10 shadow rounded-lg items-center space-x-2 px-3">
              <MoveDown />
              <span>Withdraw</span>
            </Button>
            <Button variant="ghost" className="flex flex-col hover:bg-white hover:text-primary bg-white py-10 shadow rounded-lg items-center space-x-2 px-3">
              <CreditCard />
              <span>Add Card</span>
            </Button>
          </div>
          <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-white">Payment Method</h3>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
              <div className="flex items-center gap-4">
                <Image src="/admin/cards/visa.png" alt="Visa Card" width={64} height={40} className="rounded" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Mastercard ****1234</h4>
                  <span className="text-sm text-gray-500 dark:text-slate-300">05/02/2025</span>
                </div>
              </div>
              <Trash className="text-red-500 hover:text-red-600 cursor-pointer" />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md">
              <div className="flex items-center gap-4">
                <Image src="/admin/cards/visa.png" alt="Visa Card" width={64} height={40} className="rounded" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Mastercard ****3333</h4>
                  <span className="text-sm text-gray-500 dark:text-slate-300">05/02/2025</span>
                </div>
              </div>
              <Trash className="text-red-500 hover:text-red-600 cursor-pointer" />
            </div>

            <div>
              <Button className="w-full">+ Add New Card</Button>
            </div>
          </div>
        </div>
      </div>


      {/* Main area */}
      <main className="mt-4">

        <Card className="mt-0 shadow-none bg-transparent border-0">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <TabButton label="Deposit" isActive={activeMainTab === 'deposit'} onClick={() => setActiveMainTab('deposit')} />
              <TabButton label="Withdrawal" isActive={activeMainTab === 'withdrawal'} onClick={() => setActiveMainTab('withdrawal')} />
              <TabButton label="Payment" isActive={activeMainTab === 'payment'} onClick={() => setActiveMainTab('payment')} />
              <TabButton label="Refund" isActive={activeMainTab === 'refund'} onClick={() => setActiveMainTab('refund')} />
            </div>
            <SearchInput value={search} onChange={(v) => setSearch(v)} placeholder="Search media..." />
          </CardHeader>

          <CardContent>
            {/* Show table based on active main tab */}
            {activeMainTab === 'deposit' && (
              <Table>
                <TableHeading>
                  <TableColumn isHeader>TRANSACTION ID</TableColumn>
                  <TableColumn isHeader>SERVICE</TableColumn>
                  <TableColumn isHeader>METHOD</TableColumn>
                  <TableColumn isHeader>AMOUNT</TableColumn>
                  <TableColumn isHeader>DATE & TIME</TableColumn>
                  <TableColumn isHeader>STATUS</TableColumn>
                  <TableColumn isHeader>ACTION</TableColumn>
                </TableHeading>
                <TableBody>
                  {pageData.map((item: TableItem) => (
                    <TableRow key={item.id}>
                      <TableColumn>{item.id}</TableColumn>
                      <TableColumn>Technical</TableColumn>
                      <TableColumn>{item.method}</TableColumn>
                      <TableColumn>{item.amount}</TableColumn>
                      <TableColumn>{item.date}</TableColumn>
                      <TableColumn>
                        <span className={`px-2 py-1 rounded text-xs ${item.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                      </TableColumn>
                      <TableColumn>
                        <Button variant="outline" size="sm">View</Button>
                      </TableColumn>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeMainTab === 'withdrawal' && (
              <Table>
                <TableHeading>
                  <TableColumn isHeader>WITHDRAW ID</TableColumn>
                  <TableColumn isHeader>METHOD</TableColumn>
                  <TableColumn isHeader>AMOUNT</TableColumn>
                  <TableColumn isHeader>DATE & TIME</TableColumn>
                  <TableColumn isHeader>STATUS</TableColumn>
                  <TableColumn isHeader>ACTION</TableColumn>
                </TableHeading>
                <TableBody>
                  {pageData.map((item: TableItem) => (
                    <TableRow key={item.id}>
                      <TableColumn>{item.id}</TableColumn>
                      <TableColumn>{item.method}</TableColumn>
                      <TableColumn>{item.amount}</TableColumn>
                      <TableColumn>{item.date}</TableColumn>
                      <TableColumn>
                        <span className={`px-2 py-1 rounded text-xs ${item.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                      </TableColumn>
                      <TableColumn>
                        <Button variant="outline" size="sm">View</Button>
                      </TableColumn>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeMainTab === 'payment' && (
              <Table>
                <TableHeading>
                  <TableColumn isHeader>PAY ID</TableColumn>
                  <TableColumn isHeader>METHOD</TableColumn>
                  <TableColumn isHeader>AMOUNT</TableColumn>
                  <TableColumn isHeader>DATE & TIME</TableColumn>
                  <TableColumn isHeader>STATUS</TableColumn>
                  <TableColumn isHeader>ACTION</TableColumn>
                </TableHeading>
                <TableBody>
                  {pageData.map((item: TableItem) => (
                    <TableRow key={item.id}>
                      <TableColumn>{item.id}</TableColumn>
                      <TableColumn>{item.method}</TableColumn>
                      <TableColumn>{item.amount}</TableColumn>
                      <TableColumn>{item.date}</TableColumn>
                      <TableColumn>
                        <span className={`px-2 py-1 rounded text-xs ${item.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                      </TableColumn>
                      <TableColumn>
                        <Button variant="outline" size="sm">View</Button>
                      </TableColumn>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeMainTab === 'refund' && (
              <Table>
                <TableHeading>
                  <TableColumn isHeader>REFUND ID</TableColumn>
                  <TableColumn isHeader>METHOD</TableColumn>
                  <TableColumn isHeader>AMOUNT</TableColumn>
                  <TableColumn isHeader>DATE & TIME</TableColumn>
                  <TableColumn isHeader>STATUS</TableColumn>
                  <TableColumn isHeader>ACTION</TableColumn>
                </TableHeading>
                <TableBody>
                  {pageData.map((item: TableItem) => (
                    <TableRow key={item.id}>
                      <TableColumn>{item.id}</TableColumn>
                      <TableColumn>{item.method}</TableColumn>
                      <TableColumn>{item.amount}</TableColumn>
                      <TableColumn>{item.date}</TableColumn>
                      <TableColumn>
                        <span className={`px-2 py-1 rounded text-xs ${item.status === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                      </TableColumn>
                      <TableColumn>
                        <Button variant="outline" size="sm">View</Button>
                      </TableColumn>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="pt-4 px-5">
          <Pagination currentPage={page} totalPages={totalPages} pageSize={PAGE_SIZE} totalResults={filtered.length} onPageChange={(p: number) => setPage(p)} />
        </div>

      </main>
    </div>
  )
}

export default WalletCard
