"use client"

import * as React from "react"

import { cn } from "@/lib/cn"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-line-strong", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group/row border-b transition-colors hover:bg-sunken has-aria-expanded:bg-sunken data-[state=selected]:bg-sunken",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      /*
       * A column heading, set apart from what is under it. It was the same size,
       * weight and colour as the knowledge in the column, which is how every table
       * here read as one undifferentiated block.
       *
       * The colour is on this element and not on the `thead` around it, deliberately.
       * A descendant rule on the parent outranks a class on the child, so a heading
       * that has to be marked — a Facet no Module has anything under, which is the
       * whole reason the grid is drawn as a grid — would lose its mark to the
       * default. Set here, the call site wins, which is the way round it has to be.
       *
       * A `th` with `scope="row"` gets this too, and every one of them says so at its
       * own call site: it is a row's name and not a column's heading, and it reads as
       * the knowledge it labels.
       */
      className={cn(
        /*
         * Set small and padded narrow, because a heading is what decides a column's
         * width. At the body's own size, set in capitals, the grid's eight Facet
         * columns grew wide enough to push its last two off the edge — and those two
         * carry the figure and its movement, which is what a row is read for.
         */
        "h-10 px-2 text-left align-middle text-[0.6875rem] font-semibold tracking-wide whitespace-nowrap text-ink-faint uppercase [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
