"use client"

import { Badge } from "@/src/shared/ui/ui/badge"
import { Button } from "@/src/shared/ui/ui/button"
import { Modal } from "@/src/shared/ui/ui/modal"
import { Download, Eye } from "lucide-react"
import Image from "next/image"
import React, { useState } from 'react'

interface AffiliateProfileTabProps {
  affiliateId: string
  fullName: string
  status: "ACTIVE" | "SUSPEND" | "DORMANT" | "CLOSED" | "BLOCK"
  joiningDate: string
  currentLevel: string
  rank: string
  progress: string
  nationality: string
  dateOfBirth: string
  nationalIdentity: string
  phoneNumber: string
  email: string
  secondaryEmail: string
  preferredCurrency: string
  profileImage: string
  scanFaceImage: string
  passportImage: string
  isVerified: boolean
}

const statusVariant = (s: string) => {
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
      return "bg-gray-100 text-gray-700"
  }
}

export const UserProfileTab: React.FC<AffiliateProfileTabProps> = ({
  fullName,
  status,
  joiningDate,
  nationality,
  dateOfBirth,
  nationalIdentity,
  phoneNumber,
  email,
  secondaryEmail,
  preferredCurrency,
  profileImage,
  scanFaceImage,
  passportImage,
  isVerified,
}) => {
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string; filename: string } | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Simple mock state for editable contact info
  const [provider, setProvider] = useState("Gmail")
  const [countryCode, setCountryCode] = useState("+1")
  const [contactValue, setContactValue] = useState(phoneNumber || "")
  const [pendingContacts, setPendingContacts] = useState<string[]>(contactValue ? [contactValue] : [])


  const handleViewImage = (url: string, title: string, filename: string) => {
    setSelectedImage({ url, title, filename })
    setShowImageModal(true)
  }

  const handleDownloadImage = (url: string, filename: string) => {
    // In a real app, this would trigger an actual download
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAddContact = () => {
    if (!contactValue.trim()) return
    setPendingContacts((prev) => Array.from(new Set([...prev, contactValue.trim()])))
    setContactValue("")
  }

  const handleRemoveContact = (value: string) => {
    setPendingContacts((prev) => prev.filter((c) => c !== value))
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
        {/* Profile Header with Image */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Profile Image */}
          <div className="shrink-0">
            <div className="relative w-24 h-24 md:w-32 md:h-32">
              <Image
              width={128}
              height={128}
                src={profileImage}
                alt={fullName}
                className="w-full h-full rounded-full object-cover border-4 border-blue-400"
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                {/* <h2 className="text-xl md:text-2xl font-bold text-gray-800">Affiliate account</h2> */}
                <p className="text-sm text-gray-600">
                  Joining date - {new Date(joiningDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-gray-600">Primary - {email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={statusVariant(status)}>{status}</Badge>
                {isVerified && (
                  <Badge className="bg-green-50 text-green-600 border border-green-200">
                    ✓ Verified Account
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                  Edit
                </Button>
              </div>
            </div>
       
          </div>
        </div>

        {/* Level Progress Bar */}
      

        {/* User Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Full Name</label>
              <p className="text-base text-gray-800 mt-1">{fullName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Date of Birth</label>
              <p className="text-base text-gray-800 mt-1">{dateOfBirth}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone Number</label>
              <p className="text-base text-gray-800 mt-1">{phoneNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email Address</label>
              <p className="text-base text-gray-800 mt-1">{email}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Nationality</label>
              <p className="text-base text-gray-800 mt-1">{nationality}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">National Identity</label>
              <p className="text-base text-gray-800 mt-1">{nationalIdentity}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Secondary Email</label>
              <p className="text-base text-gray-800 mt-1">{secondaryEmail}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Preferred Currency</label>
              <p className="text-base text-gray-800 mt-1">{preferredCurrency}</p>
            </div>
          </div>
        </div>

        {/* Document Images */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">SCAN FACE</p>
                  <p className="text-xs text-gray-500">2.4 MB • Uploaded: January 15, 2024</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleViewImage(scanFaceImage, "SCAN FACE", "photo")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleDownloadImage(scanFaceImage, "scan_face_photo.jpg")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            
            <p className="text-xs text-blue-600 mt-2">photo</p>
          </div>


          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">PASSPORT</p>
                  <p className="text-xs text-gray-500">2.4 MB • Uploaded: January 15, 2024</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleViewImage(passportImage, "PASSPORT", "passport_scan.pdf")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleDownloadImage(passportImage, "passport_scan.pdf")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
           
            <p className="text-xs text-blue-600 mt-2">passport_scan.pdf</p>
          </div>
        </div> */}
      </div>

      {/* Image View Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={selectedImage?.title || ""}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            <Image
            width={600}
            height={600}
              src={selectedImage?.url || ""} 
              alt={selectedImage?.title || ""} 
              className="w-full h-auto max-h-[500px] object-contain"
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">{selectedImage?.filename}</p>
            <Button
              onClick={() => selectedImage && handleDownloadImage(selectedImage.url, selectedImage.filename)}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Change account owner"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The previous email will be discarded and the new email will be added.
          </p>

          {/* Add new contact */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option>Gmail</option>
                <option>Outlook</option>
                <option>Yahoo</option>
              </select>

              <div className="flex  items-center gap-2 flex-1">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white w-28"
                >
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+213">+213</option>
                </select>
                <input
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder="Enter phone/email"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <Button onClick={handleAddContact} >
                Add
              </Button>
            </div>
          </div>

          {/* Pending contacts */}
          <div className="space-y-2">
            {pendingContacts.map((item) => (
              <div key={item} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2">
                <input
                  value={`${countryCode} ${item}`}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-800"
                />
                <Button
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveContact(item)}
                >
                  Delete
                </Button>
                <input type="checkbox" className="w-4 h-4 border-gray-300 rounded" defaultChecked />
              </div>
            ))}
            {pendingContacts.length === 0 && (
              <p className="text-xs text-gray-500">No contacts added yet.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline"  onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default UserProfileTab
