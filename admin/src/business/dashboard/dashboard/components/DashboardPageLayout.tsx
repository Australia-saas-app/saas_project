"use client";
import {
  ArcElement,
  Chart,
  DoughnutController,
  Legend,
  registerables,
  Tooltip,
} from "chart.js";
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Monitor, 
  Smartphone, 
  Globe, 
  Mail, 
  Search, 
  Share2,
  Sparkles,
  Database
} from "lucide-react";
import React, { useEffect,  useState } from "react";
import { useAppSelector } from "@/src/core/store/hooks";
// Chart registration will be run client-side inside useEffect to avoid SSR side-effects

import { Inter } from "next/font/google";

const inter = Inter({
  weight: ["600"],
  subsets: ["latin"],
});
import moment from "moment";
// Chart registration happens client-side inside useEffect


import Link from "next/link";
import demoDashboardData, {
  demoOrders,
  demoPayments,
  demoReturns,
  demoAgencies,
} from "./demoDashboardData";
import CardDataStats from "./CardDataStats";
import dynamic from "next/dynamic";

const CustomLineChart = dynamic(() => import("./CustomLineChart"), { ssr: false });
const TrafficByDeviceChart = dynamic(() => import("./TrafficByDeviceChart"), { ssr: false });
const TrafficLocationChart = dynamic(() => import("./TrafficLocationChart"), { ssr: false });
// const MarketingSeoChart = dynamic(() => import("./MarketingSeoChart"), { ssr: false });

const DashboardPageLayout: React.FC = () => {
  // const dispatch = useDispatch();


  // Use demo data until backend is wired. Replace with backend-driven data later.
  const testData = demoDashboardData;

  // Replace backend selectors with demo objects for local development.
  // Allow explicit-any for demo objects to match runtime shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderData: any = demoOrders;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentsData: any = demoPayments;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const returnData: any = demoReturns;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agencyData: any = demoAgencies;

  // const actions = useMemo(
  //   () =>
  //     bindActionCreators(
  //       {
  //         getAdminOrdersData,
  //         getAdminDashboadUsersData,
  //         getAdminDashboadPaymentsData,
  //         getAdminDashboadRetrunsData,
  //         getAdminDashboadAgenciesData,
  //       },
  //       dispatch
  //     ),
  //   [dispatch]
  // );
  const [visibleCount] = useState(8);
  // Prevent SSR/CSR layout mismatch by rendering after client mount
  const [mounted, setMounted] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [stats, setStats] = useState<any>({ totalUsers: 0, userCount: 0, businessCount: 0, affiliateCount: 0 });
  const token = useAppSelector(state => state.auth.token);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/sso/auth/admin/users?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const resData = await response.json();
          const types = resData.data?.analytics?.accountTypes || [];
          const userObj = types.find((t:any) => t.accountType === 'user');
          const businessObj = types.find((t:any) => t.accountType === 'business');
          const affiliateObj = types.find((t:any) => t.accountType === 'affiliate');
          setStats({
            totalUsers: resData.data?.analytics?.totalUsers || 0,
            userCount: userObj ? Number(userObj.count) : 0,
            businessCount: businessObj ? Number(businessObj.count) : 0,
            affiliateCount: affiliateObj ? Number(affiliateObj.count) : 0,
          });
        }
      } catch (e) {}
    };
    if (token) fetchStats();
  }, [token]);

  // keep `visibleCount` state for potential "See more" UI; no handler needed currently
  if (!mounted) {
    // Render a placeholder with the same min-height to avoid layout shift
    return <div className="min-h-screen" />;
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
      {/* Welcome Header */}
      <div className="relative z-0 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome back, Mr Jack!
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2">
            Here's what's happening with your System Database today.
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50 shadow-sm shrink-0">
          <div className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </div>
          System Connected
        </div>
      </div>



      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <CardDataStats item={{ name: "Total Accounts", number: stats.totalUsers, icon: Users }} index={0} />
        <CardDataStats item={{ name: "Users", number: stats.userCount, icon: Smartphone }} index={1} />
        <CardDataStats item={{ name: "Businesses", number: stats.businessCount, icon: Globe }} index={2} />
        <CardDataStats item={{ name: "Affiliates", number: stats.affiliateCount, icon: Share2 }} index={3} />
      </div>

      {/* Row 2: Visitor Analytics */}
      <div className="w-full">
        <CustomLineChart />
      </div>

      {/* Row 3: Traffic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrafficByDeviceChart />
        <TrafficLocationChart />
      </div>
      {/* End of new layout wrapper */}
      {/* <div className="md:flex flex-wrap h-fit  w-full gap-8 lg:w-1/4 ">
        <div className="text-black  w-full  bg-white  h-fit  rounded-2xl shadow-md p-4   ">
          <div className="flex flex-row  justify-between    mb-2">
            <h2 className="header font-medium    text-sm font-inter">
              New Orders
            </h2>
            <h2 className="header font-medium text-black  text-sm font-inter">
              New {orderData?.userorders?.length || 0}
            </h2>
          </div>
          <ul className="space-y-4">
              {orderData?.userorders
              ?.slice(0, 3)
              ?.map((order: any, index: number) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 border-[0.5px]  border-[#00000030] rounded-xl px-2 py-2"
                >
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="font-inter text-sm font-normal  text-black overflow-hidden text-ellipsis whitespace-nowrap">
                      {order.project_type}
                    </p>
                    <p className="text-sm text-black/50 overflow-hidden text-ellipsis whitespace-nowrap">
                      {order.budget} USD
                    </p>
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-xs text-nowrap text-gray-500">
                      {moment(order.createdAt).fromNow()}
                    </p>
                  </div>
                </li>

              ))}
          </ul>
          <Link href={"/c/orders"} className="flex flex-row justify-end mt-2 ">
            <span className="w-[116px] text-center text-[12px] leading-[18px] rounded-md font-normal border border-[#FFB20033] py-2">
              see all orders
            </span>
          </Link>
        </div>
        <div className="text-black  w-full  bg-white  h-fit  rounded-2xl shadow-md p-4   ">
          <div className="flex flex-row justify-between  mb-2">
            <h2 className="header font-medium text-[#000000]   text-sm font-inter">
              New Agency
            </h2>
            <h2 className="header font-medium text-[#000000]   text-sm font-inter">
              New {agencyData?.totalAgency || 0}
            </h2>
          </div>
          <ul className="space-y-4 ">
              {agencyData?.agencies
              ?.slice(0, 3)
              ?.map((agency: any, index: number) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 border-[0.5px]  border-[#00000030] rounded-xl px-2 py-2"
                >
                  <div className="w-[60%] text-ellipsis text-left overflow-hidden whitespace-nowrap">
                    <p className="font-inter text-sm text-nowrap text-ellipsis font-normal  text-black overflow-hidden">
                      {agency.agencyName}
                    </p>
                    <p className="text-sm text-black/50 overflow-hidden text-ellipsis whitespace-nowrap">
                      {agency.fullName}
                    </p>
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500 text-ellipsis ">
                      {moment(agency.createdAt).fromNow()}
                    </p>
                  </div>
                </li>

              ))}
          </ul>
          <Link href={"/c/agency"} className="flex flex-row justify-end mt-2">
            <span className="w-[116px] text-center text-[12px] leading-[18px] rounded-md font-normal border border-[#FFB20033] py-2">
              see all agency
            </span>
          </Link>
        </div>

        <div className="text-black  w-full  bg-white  h-fit  rounded-2xl shadow-md p-4   ">
          <div className="flex flex-row justify-between  mb-2">
            <h2 className="header font-medium text-[#000000]   text-sm font-inter">
              New Payments
            </h2>
            <h2 className="header font-medium text-[#000000]   text-sm font-inter">
              New {paymentsData?.totaluserpayment || 0}
            </h2>
          </div>

          <ul className="space-y-4  ">
            {paymentsData?.userpayment
              ?.slice(0, 3)
              ?.map((payment: any, index: number) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 border-[0.5px]  border-[#00000030] rounded-xl px-2 py-2"
                >
                  <div className="flex-1 text-left">
                    <p className="font-inter text-sm font-normal  text-black">
                      {payment.account_name}
                    </p>
                    <p className="text-sm text-black/50">
                      {payment.amount} USD
                    </p>
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500">
                      {moment(payment.createdAt).fromNow()}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
          <Link
            href={"/c/allpayment"}
            className="flex flex-row justify-end mt-2"
          >
            <span className="w-[116px] text-center text-[12px] leading-[18px] rounded-md font-normal border border-[#FFB20033] py-2">
              see all payments
            </span>
          </Link>
        </div>

        <div className="text-black  w-full  bg-white  h-fit  rounded-2xl shadow-md p-4   ">
          <div className="flex flex-row justify-between  mb-2">
            <h2 className="header font-medium text-[#000000]   text-sm font-inter">
              New Returns
            </h2>
            <h2 className="header font-medium text-[#000000]   text-sm font-inter">
              New {returnData?.userrefund?.length || 0}
            </h2>
          </div>

          <ul className="space-y-4">
            {returnData?.userrefund
              ?.slice(0, 3)
              ?.map((withdraw: any, index: number) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 border-[0.5px]  border-[#00000030] rounded-xl px-2 py-2"
                >
                  <div className="flex-1 text-left">
                    <p className="font-inter text-sm font-normal  text-black">
                      {withdraw.account_name}
                    </p>
                    <p className="text-sm text-black/50">
                      {withdraw.amount} USD
                    </p>
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500">
                      {moment(withdraw.createdAt).fromNow()}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
          <Link href={"/c/withdraw"} className="flex flex-row justify-end mt-2">
            <span className="w-[116px] text-center text-[12px] leading-[18px] rounded-md font-normal border border-[#FFB20033] py-2">
              see all returns
            </span>
          </Link>
        </div>
      </div> */}
    </div>
  );
};

export default DashboardPageLayout;
