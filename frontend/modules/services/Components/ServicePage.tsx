"use client";

import React from 'react'
import ServiceLayout from './ServiceLayout'
import ServiceMainSection from './ServiceMainSection'
import { InvestmentHub } from '@/src/modules/investment/components/InvestmentHub'

const ServicePage = ({service}: {service: string}) => {
  if (service?.toLowerCase() === 'investment') {
    return <InvestmentHub />
  }

  return (
    <ServiceLayout>
      <ServiceMainSection  service={String(service)} />
    </ServiceLayout>
  )
}

export default ServicePage