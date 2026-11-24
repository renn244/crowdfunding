import LoadingSpinner from "@/components/common/LoadingSpinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DonationOverview } from "@/types/donations"
import { CreditCard, Layers, User } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const chartConfig = {
    month: {
        label: 'Month'
    },
    amount: {
        label: 'Amount',
    }
} satisfies ChartConfig

type OverviewProps = {
    data: DonationOverview | undefined,
    isLoading: boolean
} 

const Overview = ({
    data,
    isLoading
}: OverviewProps) => {

    if (isLoading) {
        return <LoadingSpinner />
    }

    if(!data) {
        return <div>Failed to fetch data</div>
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Raised
                        </CardTitle>
                        <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{data.totalDonations.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Active Campaigns
                        </CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.activeCampaignscount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.totalDonors}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Avg. Donation
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{data.averageDonation.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Donation Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig}>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart accessibilityLayer data={data?.monthlyDonationsStats}>
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${value}`} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                                    <Bar dataKey="amount" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>
                            Recent Donations
                        </CardTitle>
                        <CardDescription>
                            The latest 10 donations to your campaigns.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[490px] px-[24px] pb-[12px]">
                            <div className="space-y-8">
                                {data.recentDonations.map((donation) => (
                                    <div key={donation.id} className="flex items-center">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={donation.user?.profile} alt="Avatar" />
                                        <AvatarFallback>{(donation.user?.username || donation.firstName || 'A')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{donation.user?.username || `${donation.firstName} ${donation.lastName}`}</p>
                                        <p className="text-sm text-muted-foreground">
                                        {donation.user?.email || donation.email}
                                        </p>
                                    </div>
                                        <div className="ml-auto font-medium">₱{donation.amount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Overview