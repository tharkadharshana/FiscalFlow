
'use client';

import { useAppContext } from "@/contexts/app-context";
import { Button } from "../ui/button";
import { Rocket, X } from "lucide-react";
import { useMemo } from "react";

export function ActiveTripBanner() {
    const { userProfile, tripPlans, endTrip } = useAppContext();

    const activeTrip = useMemo(() => {
        if (!userProfile?.activeTripId) return null;
        return tripPlans.find(trip => trip.id === userProfile.activeTripId);
    }, [userProfile, tripPlans]);

    if (!activeTrip) {
        return null;
    }

    return (
        <div className="bg-primary/10 border-b border-primary/20 text-primary-foreground px-4 py-2 flex items-center justify-center text-center gap-4">
            <Rocket className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-primary">
                Trip Mode Active: <span className="font-bold">{activeTrip.title}</span>. All new expenses will be linked to this trip.
            </p>
            <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:bg-primary/20 hover:text-primary"
                onClick={() => endTrip(activeTrip.id)}
            >
                <X className="mr-2 h-4 w-4" />
                End Trip
            </Button>
        </div>
    );
}
