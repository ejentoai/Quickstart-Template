"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";

// import { saveModelId } from '@/app/(chat)/actions';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { models } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";
import { Separator } from "./ui/separator";

export function ModelSelector({
  selectedModelId,
  className,
  corpus,
  setSelectedCorpus,
  selectedCorpus,
}: {
  selectedModelId: string;
  corpus: any;
  setSelectedCorpus: any;
  selectedCorpus: any;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleInputChange = (e: any) => {
    setQuery(e.target.value);
    // if (!open) setOpen(true); // Open popover when typing
  };

  let filteredFrameworks = corpus.filter((framework: any) =>
    framework.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          {selectedCorpus?.name
            ? selectedCorpus?.name === "all products"
              ? "All Products"
              : selectedCorpus?.name
            : "Select Doc"}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[200px] max-h-52 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
      >
        <input
          type="text"
          placeholder="Search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={(e) => e.stopPropagation()}
          className="p-1 rounded-sm border focus:outline-none w-full text-sm"
        />
        <DropdownMenuItem
          key={"all prodcuts"}
          onSelect={() => {
            setOpen(false);
            setSelectedCorpus({
              name: "all products",
              version: null,
              corpusId: null,
            });
            localStorage.setItem(
              "selectedCorpus",
              JSON.stringify({
                name: "all products",
                version: null,
                corpusId: null,
              })
            );
          }}
          className="gap-4 group/item flex flex-row justify-between items-center cursor-pointer"
          // data-active={model.id === optimisticModelId}
        >
          {"All Products"}
          {selectedCorpus?.name == "all products" && <CheckCircleFillIcon />}
        </DropdownMenuItem>
        <Separator />
        {filteredFrameworks.map((model: any) => (
          <DropdownMenuItem
            key={model.name}
            onSelect={() => {
              setOpen(false);
              setSelectedCorpus({
                name: model.name,
                version: model.versions?.at(0),
                corpusId: model.corpusIds?.at(0),
              });
              localStorage.setItem(
                "selectedCorpus",
                JSON.stringify({
                  name: model.name,
                  version: model.versions?.at(0),
                  corpusId: model.corpusIds?.at(0),
                })
              );
            }}
            className="gap-4 group/item flex flex-row justify-between items-center cursor-pointer"
            // data-active={model.id === optimisticModelId}
          >
            {model.name}
            {selectedCorpus?.name == model?.name && <CheckCircleFillIcon />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
