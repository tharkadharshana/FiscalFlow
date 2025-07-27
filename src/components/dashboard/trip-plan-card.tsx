

'use client';

import type { TripPlan } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MoreVertical, Pencil, Trash2, Rocket, Flag, CircleCheck, PlayCircle } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from "../ui/progress";
import { useAppContext } from "@/contexts/app-context";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type TripPlanCardProps = {
  trip: TripPlan;
  onEdit: () => void;
  onDelete: () => void;
  onViewReport: () => void;
  onRestart: () => void;
};

export function TripPlanCard({ trip, onEdit, onDelete, onViewReport, onRestart }: TripPlanCardProps) {
  const { formatCurrency, updateUserPreferences, userProfile, updateTripPlan } = useAppContext();
  
  const progress = trip.totalPredictedCost > 0 ? ((trip.totalActualCost || 0) / trip.totalPredictedCost) * 100 : 0;
  const uniqueCategories = [...new Set(trip.items.map(item => item.category))];
  const isActiveTrip = userProfile?.activeTripId === trip.id;
  const isAnotherTripActive = !!userProfile?.activeTripId && !isActiveTrip;

  const handleStartTrip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Starting trip', { tripId: trip.id });
    await updateUserPreferences({ activeTripId: trip.id });
    await updateTripPlan(trip.id, { status: 'active' });
  }

  const handleEndTrip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Ending trip', { tripId: trip.id });
    await updateUserPreferences({ activeTripId: null });
    await updateTripPlan(trip.id, { status: 'completed' });
  }

  return (
    <Card className={cn("flex flex-col transition-shadow hover:shadow-lg", isActiveTrip && "ring-2 ring-primary shadow-lg")}>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="text-xl">{trip.title}</CardTitle>
          <CardDescription className="capitalize pt-1 font-medium flex items-center gap-2">
            {trip.status === 'active' && <Rocket className="h-4 w-4 text-primary animate-pulse" />}
            {trip.status === 'completed' && <CircleCheck className="h-4 w-4 text-green-600" />}
            {trip.status}
          </CardDescription>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {trip.status === 'planning' && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>}
                {trip.status === 'completed' && <DropdownMenuItem onClick={onRestart} disabled={isAnotherTripActive}><PlayCircle className="mr-2 h-4 w-4" /> Restart Trip</DropdownMenuItem>}
                {trip.status === 'completed' && <DropdownMenuItem onClick={onViewReport}><Flag className="mr-2 h-4 w-4" /> View Report</DropdownMenuItem>}
                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex items-baseline justify-between font-mono">
            <div>
                <p className="text-sm text-muted-foreground">Actual</p>
                <span className="text-2xl font-bold">{formatCurrency(trip.totalActualCost || 0)}</span>
            </div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Predicted</p>
                <span className="text-lg text-muted-foreground">{formatCurrency(trip.totalPredictedCost)}</span>
            </div>
        </div>
        <Progress value={progress} />
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
         <div className="w-full">
            {trip.status === 'planning' && (
                <Button onClick={handleStartTrip} className="w-full" disabled={!!userProfile?.activeTripId}>
                    <Rocket className="mr-2 h-4 w-4"/> Start Trip
                </Button>
            )}
            {trip.status === 'active' && (
                <Button onClick={handleEndTrip} className="w-full" variant="destructive">
                    <Flag className="mr-2 h-4 w-4"/> End Trip
                </Button>
            )}
            {trip.status === 'completed' && (
                 <Button onClick={onViewReport} className="w-full" variant="secondary">
                    <Flag className="mr-2 h-4 w-4" /> View Report
                </Button>
            )}
         </div>
         <div className="flex flex-wrap gap-2">
            {uniqueCategories.slice(0, 4).map(category => (
                <Badge key={category} variant="outline">{category}</Badge>
            ))}
            {uniqueCategories.length > 4 && (
                <Badge variant="secondary">+{uniqueCategories.length - 4} more</Badge>
            )}
         </div>
      </CardFooter>
    </Card>
  );
}
