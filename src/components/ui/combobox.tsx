"use client";

import * as React from "react";
import {
  Check,
  ChevronsDown,
  ChevronsRightIcon,
  ChevronDown,
  ChevronRightIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "./separator";
import { Item } from "@/model";

const frameworks = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
];


export function CustomCombobox(props: any) {
  const { corpus, setSelectedCorpus, selectedCorpus } = props;
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("All Products");
  const [query, setQuery] = React.useState("");
  const [nestedOpen, setNestedOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (selectedCorpus) {
      setValue(selectedCorpus.name == 'all products' ? 'All Products' : selectedCorpus.name)
    }
  }, [])

  // Filter frameworks based on query
  let filteredFrameworks = corpus.filter((framework: any) =>
    framework.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleInputChange = (e: any) => {
    setQuery(e.target.value);
    // if (!open) setOpen(true); // Open popover when typing
  };

  const handleSelect = (currentValue: any) => {
    setValue(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  return (
    <div className="flex items-center space-x-1 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[500px] justify-between"
          >
            {value || "Select Documentation"}
            <ChevronDown className="opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[500px] p-0 max-h-60"
        >
          <Command>
            <input
              type="text"
              placeholder="Search documentations..."
              value={query}
              onChange={handleInputChange}
              className="p-4 border focus:outline-none w-full"
            />
            <CommandList onScroll={() => setNestedOpen(null)}>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    handleSelect("All Products");
                    // setSelectedCorpus("all products");
                    setSelectedCorpus({ name: 'all products', version: null, corpusId: null });
                    localStorage.setItem(
                      "selectedCorpus",
                      JSON.stringify({
                        name: 'all products',
                        version: null,
                        corpusId: null,
                      })
                    );
                  }}
                  onMouseEnter={() => setNestedOpen("All Products")}
                  onMouseLeave={() => setNestedOpen(null)}
                  className="cursor-pointer my-2"
                >
                  {/* {framework.name} */}
                  All Products
                  <Check
                    className={cn(
                      "ml-auto",
                      value === "All Products" ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
                <Separator />
              </CommandGroup>
              {filteredFrameworks.length > 0 ? (
                <CommandGroup>
                  {filteredFrameworks.map((framework: any) => (
                    <div key={framework.name+framework.corpusIds?.at(0)}>
                      {framework.versions?.length > 0 && framework.versions?.at(0) !== '' ? (
                        <Popover open={nestedOpen === framework.name}>
                          <PopoverTrigger asChild>
                            <CommandItem
                              className="justify-between"
                              onMouseEnter={() => setNestedOpen(framework.name)}
                            >
                              <div className="flex items-center justify-between w-full">
                                {framework.name}
                                <ChevronRightIcon className="opacity-50" />
                              </div>
                            </CommandItem>
                          </PopoverTrigger>

                          <PopoverContent
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            className="w-[160px] p-0 max-h-60 overflow-auto"
                            align="start"
                            side="right"
                          >
                            {framework.versions.map((version: any, index: number) => (
                              version !== '' && <CommandItem
                                key={version}
                                onSelect={() => {
                                  handleSelect(framework?.name + " " + version);
                                  setSelectedCorpus({ name: framework?.name, version: version, corpusId: framework?.corpusIds?.at(index) }); 
                                  localStorage.setItem(
                                    "selectedCorpus",
                                    JSON.stringify({
                                      name: framework?.name,
                                      version: version,
                                      corpusId: framework?.corpusIds?.at(index),
                                    })
                                  );
                                }}
                                className="cursor-pointer"
                              >
                                {version}
                                <Check
                                  className={cn(
                                    "ml-auto",
                                    value === version
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <CommandItem
                          onSelect={() => {
                            if(value == framework.name) {
                              handleSelect(null);
                              setSelectedCorpus(null);
                              localStorage.removeItem("selectedCorpus");
                            } else {
                              handleSelect(framework.name);
                              setSelectedCorpus({ name: framework?.name, version: '', corpusId: framework?.corpusIds?.at(0) }); 
                              localStorage.setItem(
                                "selectedCorpus",
                                JSON.stringify({
                                  name: framework?.name,
                                  version: '',
                                  corpusId: framework?.corpusIds?.at(0),
                                })
                              );
                            }
                          }}
                          onMouseEnter={() => setNestedOpen(framework.name)}
                          onMouseLeave={() => setNestedOpen(null)}
                          className="cursor-pointer"
                        >
                          {framework.name}
                          <Check
                            className={cn(
                              "ml-auto",
                              value === framework.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      )}
                    </div>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No documentation found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
