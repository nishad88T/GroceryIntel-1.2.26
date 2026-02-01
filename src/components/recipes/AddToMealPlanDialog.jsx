import React, { useState, useEffect } from "react";
import { MealPlan } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MEALS = [
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snack", label: "Snack" }
];

export default function AddToMealPlanDialog({ recipe, open, onClose, onAdded }) {
    const [selectedDay, setSelectedDay] = useState("monday");
    const [selectedMeal, setSelectedMeal] = useState("dinner");
    const [servings, setServings] = useState(recipe?.servings || 4);
    const [weekStartDate, setWeekStartDate] = useState(null); // Initialize to null
    const [saving, setSaving] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUser(user);
                // Use user's preference for week start day, default to Monday (1)
                const weekStartsOn = user?.week_starts_on ?? 1;
                setWeekStartDate(startOfWeek(new Date(), { weekStartsOn }));
            } catch (error) {
                console.error("Failed to load user or preferences:", error);
                // Fallback to Monday if user data fails to load
                setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
            }
        };
        if (open) {
            loadUser();
        }
    }, [open]); // Re-run effect when dialog opens

    const handleDateSelect = (date) => {
        if (date && currentUser) {
            // Use the current user's preference for week start day
            const weekStartsOn = currentUser?.week_starts_on ?? 1;
            const weekStart = startOfWeek(date, { weekStartsOn });
            setWeekStartDate(weekStart);
            setCalendarOpen(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Re-fetch user to ensure latest household_id and shopping_frequency at time of save
            const user = await base44.auth.me(); 
            
            if (!user) {
                toast.error("Please log in to add recipes to your meal plan");
                return;
            }

            // weekStartDate is already set by useEffect based on user preference
            const weekStartString = format(weekStartDate, "yyyy-MM-dd");

            // Check if a meal plan exists for this week - search by household if available, otherwise by user email
            let existingPlans;
            if (user.household_id) {
                existingPlans = await MealPlan.filter({
                    household_id: user.household_id,
                    week_start_date: weekStartString
                });
            } else {
                existingPlans = await MealPlan.filter({
                    user_email: user.email,
                    week_start_date: weekStartString
                });
            }

            let mealPlan;
            if (existingPlans && existingPlans.length > 0) {
                // Update existing plan
                mealPlan = existingPlans[0];
                const updatedSelections = [...(mealPlan.recipe_selections || [])];
                
                // Remove any existing recipe for this day/meal slot
                const filteredSelections = updatedSelections.filter(
                    sel => !(sel.day === selectedDay && sel.meal === selectedMeal)
                );
                
                // Add new selection
                filteredSelections.push({
                    recipe_id: recipe.id,
                    day: selectedDay,
                    meal: selectedMeal,
                    servings: servings
                });

                await MealPlan.update(mealPlan.id, {
                    recipe_selections: filteredSelections
                });
            } else {
                // Create new meal plan - household_id is optional
                const mealPlanData = {
                    user_email: user.email,
                    week_start_date: weekStartString,
                    recipe_selections: [{
                        recipe_id: recipe.id,
                        day: selectedDay,
                        meal: selectedMeal,
                        servings: servings
                    }],
                    shopping_frequency: user.shopping_frequency || "weekly"
                };
                
                // Only add household_id if user has one
                if (user.household_id) {
                    mealPlanData.household_id = user.household_id;
                }
                
                await MealPlan.create(mealPlanData);
            }

            toast.success(`${recipe.title} added to ${selectedMeal} on ${selectedDay}`);
            onAdded?.();
            onClose();
        } catch (error) {
            console.error("Error adding to meal plan:", error);
            toast.error("Failed to add recipe to meal plan");
        } finally {
            setSaving(false);
        }
    };

    // Do not render dialog content until weekStartDate is initialized
    if (!recipe || !weekStartDate) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add to Meal Plan</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Week Starting</Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(weekStartDate, "PPP")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={weekStartDate}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                    // Pass the user's preferred week start day to the Calendar component
                                    weekStartsOn={currentUser?.week_starts_on ?? 1}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Day</Label>
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS.map(day => (
                                    <SelectItem key={day} value={day}>
                                        {day.charAt(0).toUpperCase() + day.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Meal</Label>
                        <Select value={selectedMeal} onValueChange={setSelectedMeal}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MEALS.map(meal => (
                                    <SelectItem key={meal.value} value={meal.value}>
                                        {meal.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Servings</Label>
                        <Input
                            type="number"
                            min="1"
                            value={servings}
                            onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            "Add to Plan"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}