"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { CreateDebtInput, DebtType } from "@/types/debt";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface AddDebtDialogProps {
  onAdd: (data: CreateDebtInput) => Promise<void>;
}

export default function AddDebtDialog({ onAdd }: AddDebtDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<CreateDebtInput>({
    personName: "",
    type: "borrowed",
    amount: 0,
    borrowedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    interestRate: 0,
    description: "",
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (formData.amount <= 0) {
      return;
    }

    if (formData.dueDate < formData.borrowedDate) {
      return;
    }

    setIsSaving(true);
    try {
      await onAdd(formData);
      setFormData({
        personName: "",
        type: "borrowed",
        amount: 0,
        borrowedDate: new Date().toISOString().slice(0, 10),
        dueDate: "",
        interestRate: 0,
        description: "",
      });
      setOpen(false);
    } catch {
      // The page displays the API error and leaves the form open for correction or retry.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <Plus className="mr-2 size-4" />
            Add Debt
          </Button>
        }
      />

      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl">
        <DialogHeader className="gap-1">
          <DialogTitle>Add New Debt</DialogTitle>
          <DialogDescription>
            Record money you borrowed or lent to someone.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-3 gap-y-3"
        >
          {/* Debt Type */}
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <Label>Debt Type</Label>

            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as DebtType,
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
          <div className="col-span-2 space-y-1 sm:col-span-1">
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

          {/* Interest Rate */}
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <Label htmlFor="interestRate">Interest Rate (% per year)</Label>

            <Input
              id="interestRate"
              className="h-9"
              type="number"
              min="0"
              step="0.01"
              value={formData.interestRate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  interestRate: Number(e.target.value),
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

          <Button
            type="submit"
            className="sticky bottom-0 col-span-2 w-full"
            disabled={isSaving}
            variant="outline"
          >
            {isSaving ? "Saving..." : "Save Debt"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
