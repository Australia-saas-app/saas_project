"use client"

import { Table, TableBody, TableColumn, TableHeading, TableRow } from "@/src/shared/ui/table"
import { Badge } from "@/src/shared/ui/ui/badge"
import { Button } from "@/src/shared/ui/ui/button"
import { Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import React from "react"
import type { UserRow } from "./users.types"

interface Props {
  items: UserRow[]
  onView?: (id: string) => void
}

const statusVariant = (s: UserRow["status"]) => {
  switch (s) {
    case "ACTIVE":
      return "bg-green-100 text-green-700"
    case "SUSPEND":
      return "bg-pink-100 text-pink-700"
    case "DORMANT":
      return "bg-gray-200 text-gray-700"
    case "CLOSED":
      return "bg-yellow-100 text-yellow-800"
    case "BLOCK":
      return "bg-red-100 text-red-700"
    default:
      return ""
  }
}

const UsersTable: React.FC<Props> = ({ items, onView }) => {
  const router = useRouter()

  const handleView = (userId: string) => {
    router.push(`/all-users/${userId}`)
    onView?.(userId)
  }
  return (
    <Table>
      <TableHeading>
        <TableColumn isHeader>User Id</TableColumn>
        <TableColumn isHeader align="center">Total Project</TableColumn>
        <TableColumn isHeader align="center">Total Amount</TableColumn>
        <TableColumn isHeader align="center">Paid Amount</TableColumn>
        <TableColumn isHeader align="center">Due Amount</TableColumn>
        <TableColumn isHeader align="center">Refund Amount</TableColumn>
        <TableColumn isHeader align="center">Profit</TableColumn>
        <TableColumn isHeader align="center">Status</TableColumn>
        <TableColumn isHeader align="center">Action</TableColumn>
      </TableHeading>

      <TableBody isEmpty={items.length === 0} colSpan={9}>
        {items.map((row) => (
          <TableRow key={row.id}>
            <TableColumn>{row.userId}</TableColumn>
            <TableColumn align="center">{row.totalProject}</TableColumn>
            <TableColumn align="center">{row.totalAmount}</TableColumn>
            <TableColumn align="center">{row.paidAmount}</TableColumn>
            <TableColumn align="center">{row.dueAmount}</TableColumn>
            <TableColumn align="center">{row.refundAmount}</TableColumn>
            <TableColumn align="center">{row.profit}</TableColumn>
            <TableColumn align="center">
              <div className="flex justify-center">
                <Badge className={statusVariant(row.status)}>{row.status}</Badge>
              </div>
            </TableColumn>
            <TableColumn align="center">
              <div className="flex justify-center">
                <button
                  onClick={() => handleView(row.userId)}
                  className="inline-flex items-center justify-center p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                  title="View User"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </TableColumn>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default UsersTable
