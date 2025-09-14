import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { LogoutButton } from "../components/LogoutButton";
import { getOnboardingStatusByEmail } from "../../lib/user";
import { DashboardCard } from "../components/DashboardCard";
import { ScheduleItem } from "../components/ScheduleItem";
import { QuickAction } from "../components/QuickAction";
import { Clock, Users, TrendingUp, Plus, Calendar, Target } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login?from=/dashboard');
  const needsOnboarding = !(await getOnboardingStatusByEmail(session.user?.email || null));
  if (needsOnboarding) redirect('/onboarding');
  
  const userName = session.user?.name || "User";
  const firstName = userName.split(" ")[0];
  
  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            Good morning, {firstName}
          </h2>
          <p className="text-gray-600">You have 5 tasks and 3 meetings scheduled for today</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
          <Plus size={16} />
          Quick Add
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard
          title="Active Focus Block"
          icon={<Clock className="w-4 h-4" />}
          value="2h 15m"
          description="Deep work session"
          badge={{ text: "In Progress", variant: "success" }}
        />
        
        <DashboardCard
          title="Next Meeting"
          icon={<Users className="w-4 h-4" />}
          value="2:30 PM"
          description="Team Standup"
          badge={{ text: "30 min", variant: "outline" }}
        />
        
        <DashboardCard
          title="Productivity Score"
          icon={<TrendingUp className="w-4 h-4" />}
          value="87%"
          description="+12% from yesterday"
          badge={{ text: "Excellent", variant: "success" }}
        />
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
        </div>
        <p className="text-gray-600 text-sm mb-6">Your calendar events and focus blocks for today</p>
        
        <div className="space-y-4">
          <ScheduleItem
            title="Deep Work Session"
            time="9:00 - 11:00 AM"
            description="Focus block for project development"
            type="focus"
            badge="Focus Time"
          />
          
          <ScheduleItem
            title="Team Standup"
            time="2:30 - 3:00 PM"
            description="Daily sync with development team"
            type="meeting"
            badge="Meeting"
          />
          
          <ScheduleItem
            title="Client Review"
            time="4:00 - 5:00 PM"
            description="Project milestone presentation"
            type="important"
            badge="Important"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
        <p className="text-gray-600 text-sm mb-6">AI-powered suggestions based on your schedule and habits</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            icon={<Clock className="w-5 h-5" />}
            title="Schedule Focus Block"
            description="2 hours available at 3 PM"
            bgColor="bg-teal-100"
            iconColor="text-teal-600"
          />
          
          <QuickAction
            icon={<Target className="w-5 h-5" />}
            title="Review Pending Tasks"
            description="4 tasks need attention"
            bgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>
      </div>

      {/* Temp logout button */}
      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  );
}
