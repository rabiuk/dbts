// FILE: src/app/(public)/contact/intake/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
// --- CHANGE: Import new date-fns functions ---
import {
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function IntakePage() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  const timeListRef = useRef<HTMLDivElement>(null);

  // --- Fetch unavailable dates for the ENTIRE VISIBLE calendar grid ---
  useEffect(() => {
    setIsLoadingAvailability(true);

    // --- CHANGE: Calculate the full visible date range ---
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    // Get the first day of the first week shown (a Sunday)
    const firstDayToFetch = startOfWeek(firstDayOfMonth);
    // Get the last day of the last week shown (a Saturday)
    const lastDayToFetch = endOfWeek(lastDayOfMonth);

    const startParam = firstDayToFetch.toISOString();
    const endParam = lastDayToFetch.toISOString();

    fetch(`/api/availability?start=${startParam}&end=${endParam}`)
      .then((res) => res.json())
      .then((dates: string[]) => {
        const unavailable = dates.map((d) => startOfDay(parseISO(d)));
        setUnavailableDates(unavailable);
      })
      .catch(() => setError("Failed to load calendar availability."))
      .finally(() => setIsLoadingAvailability(false));
  }, [currentMonth]);

  // Fetch available times when a date is selected (no change here)
  useEffect(() => {
    if (selectedDate) {
      setIsLoadingTimes(true);
      setAvailableTimes([]);
      setSelectedTime(null);
      setError(null);
      const dateParam = startOfDay(selectedDate).toISOString();
      fetch(`/api/availability?date=${dateParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableTimes(data);
          }
        })
        .catch(() => setError("Failed to load available times."))
        .finally(() => setIsLoadingTimes(false));
    }
  }, [selectedDate]);

  const handleBookingSubmit = async () => {
    if (!selectedTime) return;
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotTime: selectedTime,
          clientDetails: { ...formData },
        }),
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to create booking.");
      }
      setStep(4);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (date < today) return true;
    return unavailableDates.some(
      (unavailableDate) =>
        unavailableDate.getTime() === startOfDay(date).getTime()
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          const container = timeListRef.current;
          if (container) {
            container.scrollTop += e.deltaY;
          }
        };

        return (
          <Card className="w-full max-w-4xl shadow-none border-muted/20 p-0 gap-0">
            <CardHeader className="pb-2 px-8 pt-6 border-b-1">
              <CardTitle>Step 1: Select a Date & Time</CardTitle>
              <CardDescription>
                Choose a day and time for your consultation. Unavailable days
                are crossed out.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative p-0 md:pr-48 flex justify-around">
              <div className="p-8 ">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  disabled={isDateDisabled}
                  modifiers={{ unavailable: unavailableDates }}
                  // --- CHANGE: Improved styling for unavailable dates ---
                  modifiersClassNames={{
                    unavailable: "text-foreground/60 line-through",
                  }}
                  className="bg-transparent p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                  footer={
                    isLoadingAvailability ? (
                      <p className="text-center text-sm text-muted-foreground pt-2 animate-pulse">
                        Checking availability...
                      </p>
                    ) : null
                  }
                />
              </div>
              <div
                ref={timeListRef}
                onWheel={handleWheelScroll}
                className="no-scrollbar inset-y-0 right-0 flex max-h-72 w-full scroll-pb-8 flex-col gap-4 overflow-y-auto border-t p-8 md:absolute md:max-h-none md:w-48 md:border-t-0 md:border-l"
              >
                <div className="grid gap-2">
                  {isLoadingTimes && (
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Loading...
                    </p>
                  )}
                  {!isLoadingTimes && !selectedDate && (
                    <p className="text-sm text-muted-foreground">
                      Select a date to see times.
                    </p>
                  )}
                  {!isLoadingTimes &&
                    selectedDate &&
                    availableTimes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No slots available.
                      </p>
                    )}
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      onClick={() => setSelectedTime(time)}
                      className="w-full shadow-none"
                    >
                      {format(parseISO(time), "p")}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 border-t px-8 !py-5 md:flex-row md:items-center">
              <div className="text-sm">
                {selectedDate && selectedTime ? (
                  <>
                    You are selecting{" "}
                    <span className="font-medium">
                      {format(selectedDate, "PPP")}
                    </span>{" "}
                    at{" "}
                    <span className="font-medium">
                      {format(parseISO(selectedTime), "p")}
                    </span>
                    .
                  </>
                ) : (
                  <>Select a date and time for your meeting.</>
                )}
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedDate || !selectedTime}
                className="w-full md:ml-auto md:w-auto"
              >
                Next
              </Button>
            </CardFooter>
          </Card>
        );

      // Other cases (2, 3, 4) remain unchanged
      case 2:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Step 2: Your Information</CardTitle>
              <CardDescription>
                Please provide your contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={
                  !formData.firstName || !formData.lastName || !formData.email
                }
              >
                Review
              </Button>
            </CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Step 3: Review Your Booking</CardTitle>
              <CardDescription>
                Please confirm the details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>Date & Time:</strong>{" "}
                {selectedDate && selectedTime
                  ? `${format(selectedDate, "PPPP")} at ${format(
                      parseISO(selectedTime),
                      "p"
                    )}`
                  : ""}
              </p>
              <p>
                <strong>Name:</strong> {formData.firstName} {formData.lastName}
              </p>
              <p>
                <strong>Email:</strong> {formData.email}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleBookingSubmit}>Submit</Button>
            </CardFooter>
          </Card>
        );
      case 4:
        return (
          <Card className="w-full max-w-lg text-center">
            <CardHeader className="items-center">
              <CardTitle className="text-2xl">Request Sent!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Thank you! Your consultation request has been received.</p>
              <p className="text-muted-foreground">
                You will receive a confirmation email at{" "}
                <strong>{formData.email}</strong> once it has been approved by
                our team.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link href="/">
                <Button>Back to Home</Button>
              </Link>
            </CardFooter>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full py-20 lg:py-24">
      <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Book Your Intake Consultation
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            This initial 15-minute meeting is a crucial first step. We&apos;ll
            discuss your child&apos;s needs, answer your questions, and
            determine the best path forward together.
          </p>
        </div>
        <div className="w-full flex justify-center text-left">
          {renderStepContent()}
        </div>
        {step < 4 && (
          <div>
            <Link href="/contact">
              <Button variant="outline">← Back to General Contact</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
