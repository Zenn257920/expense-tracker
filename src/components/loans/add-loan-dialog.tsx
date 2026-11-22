"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { CreateLoanInput, LoanType } from "@/types/loan";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api-client";
import { Plus } from "lucide-react";

// Interest rate is intentionally not collected: it is stored but never
// calculated anywhere, and the server defaults it to 0 when omitted.
type NewLoanInput = Omit<CreateLoanInput, "interestRate">;

interface AddLoanDialogProps {
  onAdd: (data: NewLoanInput) => Promise<void>;
}

export default function AddLoanDialog({ onAdd }: AddLoanDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<NewLoanInput>({
    personName: "",
    type: "borrowed",
    amount: 0,
    borrowedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    description: "",
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (formData.amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (formData.dueDate < formData.borrowedDate) {
      setFormError("Due date must be on or after the start date.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await onAdd(formData);
      setFormData({
        personName: "",
        type: "borrowed",
        amount: 0,
        borrowedDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        description: "",
      });
      setOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not add loan."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setFormError(null);
        setOpen(isOpen);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <Plus className="mr-2 size-4" />
            Add loan
          </Button>
        }
      />

      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle>Add New Loan</DialogTitle>
          <DialogDescription>
            Record money you borrowed or lent to someone.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-3 gap-y-3"
        >
          {/* Loan Type */}
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <Label>Loan Type</Label>

            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as LoanType,
                })
              }
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="borrowed">Money I Borrowed</option>

              <option value="lent">Money I Lent</option>
            </select>

            <p className="text-xs leading-4 text-muted-foreground">
              {formData.type === "borrowed"
                ? "You received money and need to repay it."
                : "You gave money and expect to receive it back."}
            </p>
          </div>

          {/* Person Name */}
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <Label htmlFor="personName">Person Name</Label>

            <Input
              id="personName"
              className="h-9"
              placeholder="Enter person's name"
              required
              value={formData.personName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  personName: e.target.value,
                })
              }
            />
          </div>

          {/* Amount */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="amount">Amount (MMK)</Label>

            <Input
              id="amount"
              className="h-9"
              type="number"
              min="1"
              step="any"
              placeholder="500000"
              required
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: Number(e.target.value),
                })
              }
            />
          </div>

          {/* Dates */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="borrowedDate">Start Date</Label>

              <Input
                id="borrowedDate"
                className="h-9 px-2 text-xs sm:px-3 sm:text-sm"
                type="date"
                required
                value={formData.borrowedDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    borrowedDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="min-w-0 space-y-1">
              <Label htmlFor="dueDate">Due Date</Label>

              <Input
                id="dueDate"
                className="h-9 px-2 text-xs sm:px-3 sm:text-sm"
                type="date"
                min={formData.borrowedDate}
                required
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Description */}
          <div className="col-span-2 space-y-1">
            <Label htmlFor="description">Description (Optional)</Label>

            <Textarea
              id="description"
              className="min-h-16"
              placeholder="Add some notes..."
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
            />
          </div>

          {formError && (
            <div className="col-span-2">
              <FieldError>{formError}</FieldError>
            </div>
          )}

          <Button
            type="submit"
            className="sticky bottom-0 col-span-2 w-full"
            disabled={isSaving}
            variant="outline"
          >
            {isSaving ? "Saving..." : "Add loan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
