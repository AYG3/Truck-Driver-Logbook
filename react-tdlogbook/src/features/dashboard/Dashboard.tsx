import { Link } from "react-router-dom";
import {
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Card, StatCard, Button, LoadingSpinner } from "../../components/ui";
import { useTrips } from "../../hooks/useTrips";
import { useHOSStatus } from "../../hooks/useLogs";
import { formatHoursToDisplay } from "../../utils/time";
import { HOS_LIMITS } from "../../utils/constants";

export function Dashboard() {
  const { data: trips, isLoading: tripsLoading } = useTrips();
  const { data: hosStatus, isLoading: hosLoading } = useHOSStatus();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's your driving status overview.
          </p>
        </div>
        <Link to="/trips">
          <Button rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
            Plan New Trip
          </Button>
        </Link>
      </div>

      {/* HOS Status Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Hours of Service Status
        </h2>
        {hosLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : hosStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <HOSCard
              title="Driving Time"
              remaining={hosStatus.driving_remaining}
              limit={HOS_LIMITS.MAX_DRIVING_HOURS}
              color="green"
              icon={<TruckIcon className="h-5 w-5" />}
            />
            <HOSCard
              title="On-Duty Window"
              remaining={hosStatus.on_duty_remaining}
              limit={HOS_LIMITS.MAX_ON_DUTY_HOURS}
              color="amber"
              icon={<ClockIcon className="h-5 w-5" />}
            />
            <HOSCard
              title="70-Hour Cycle"
              remaining={hosStatus.cycle_remaining}
              limit={HOS_LIMITS.CYCLE_HOURS}
              color="blue"
              icon={<ChartBarIcon className="h-5 w-5" />}
            />
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Next Required Break</span>
                <ClockIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {hosStatus.next_required_break || "Not Required"}
              </p>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Driving Remaining"
              value={formatHoursToDisplay(HOS_LIMITS.MAX_DRIVING_HOURS)}
              subtitle={`of ${HOS_LIMITS.MAX_DRIVING_HOURS} hours`}
              icon={<TruckIcon className="h-5 w-5" />}
            />
            <StatCard
              title="On-Duty Window"
              value={formatHoursToDisplay(HOS_LIMITS.MAX_ON_DUTY_HOURS)}
              subtitle={`of ${HOS_LIMITS.MAX_ON_DUTY_HOURS} hours`}
              icon={<ClockIcon className="h-5 w-5" />}
            />
            <StatCard
              title="70-Hour Cycle"
              value={formatHoursToDisplay(HOS_LIMITS.CYCLE_HOURS)}
              subtitle={`of ${HOS_LIMITS.CYCLE_HOURS} hours`}
              icon={<ChartBarIcon className="h-5 w-5" />}
            />
            <StatCard
              title="Next Break"
              value="Not Required"
              subtitle="Take a break when needed"
              icon={<ClockIcon className="h-5 w-5" />}
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Plan a Trip"
          description="Calculate an HOS-compliant route for your next delivery"
          icon={<MapPinIcon className="h-8 w-8" />}
          to="/trips"
          color="blue"
        />
        <QuickActionCard
          title="View Logbook"
          description="Access your electronic driver logs and history"
          icon={<ChartBarIcon className="h-8 w-8" />}
          to="/logs"
          color="green"
        />
        <QuickActionCard
          title="Recent Trips"
          description="Review your completed and in-progress trips"
          icon={<TruckIcon className="h-8 w-8" />}
          to="/trips"
          color="purple"
        />
      </div>

      {/* Recent Trips */}
      <Card title="Recent Trips" subtitle="Your latest trip plans">
        {tripsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : trips && trips.results.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {trips.results.slice(0, 5).map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {trip.pickup_location} → {trip.dropoff_location}
                    </p>
                    <p className="text-sm text-gray-500">
                      From: {trip.current_location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trip.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : trip.status === "PROCESSING"
                        ? "bg-blue-100 text-blue-800"
                        : trip.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {trip.status}
                  </span>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TruckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No trips yet</p>
            <Link to="/trips">
              <Button variant="secondary" size="sm" className="mt-4">
                Plan Your First Trip
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

interface HOSCardProps {
  title: string;
  remaining: number;
  limit: number;
  color: "green" | "amber" | "blue";
  icon: React.ReactNode;
}

function HOSCard({ title, remaining, limit, color, icon }: HOSCardProps) {
  const percentage = (remaining / limit) * 100;
  const colorClasses = {
    green: {
      bg: "bg-green-50",
      bar: "bg-green-500",
      text: "text-green-600",
    },
    amber: {
      bg: "bg-amber-50",
      bar: "bg-amber-500",
      text: "text-amber-600",
    },
    blue: {
      bg: "bg-blue-50",
      bar: "bg-blue-500",
      text: "text-blue-600",
    },
  };

  const colors = colorClasses[color];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`${colors.text}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {formatHoursToDisplay(remaining)}
      </p>
      <p className="text-sm text-gray-500 mb-3">of {limit} hours</p>
      <div className={`h-2 rounded-full ${colors.bg}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
    </Card>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  color: "blue" | "green" | "purple";
}

function QuickActionCard({
  title,
  description,
  icon,
  to,
  color,
}: QuickActionCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    green: "bg-green-50 text-green-600 group-hover:bg-green-100",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
  };

  return (
    <Link to={to} className="group">
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg transition-colors ${colorClasses[color]}`}
          >
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </Card>
    </Link>
  );
}
