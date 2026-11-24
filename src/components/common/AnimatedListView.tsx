import React, { useMemo, startTransition } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useDebounce } from "../../hooks/useDataHooks";
import { PageHeader } from "../common/PageHeader";
import { ASRSearchInput } from "./ASRSearchInput";
import { ASRDataTable } from "../list/ASRDataTable";
import { ErrorBoundary } from "./ErrorBoundary";
import { normalizeForSearch } from "../../lib/utils";

interface ListColumnDef<T> {
  key: keyof T | string;
  label: string;
  type?: string;
  isRank?: boolean;
  color?: string;
  width?: string;
  getValue?: (item: T) => React.ReactNode;
}

interface SearchableListItem {
  isDivider?: boolean;
  searchKey?: string;
}

interface AnimatedListViewProps<T extends object = Record<string, unknown>> {
  title: string;
  theme: "light" | "dark";
  data: T[];
  searchPlaceholder?: string;
  searchSubtext?: React.ReactNode;
  headerControls?: React.ReactNode;
  topControls?: React.ReactNode;
  isLoading: boolean;
  onItemClick?: (item: T) => void;
  middleLabel?: string;
  columns?: ListColumnDef<T>[];
  viewType?: "card" | "table" | "list";
  hideSubtitle?: boolean;
  hideTitle?: boolean;
  categoryName?: "Players" | "Teams" | "Courses";
  showVideoColumn?: boolean;
  children?: React.ReactNode | ((props: { searchedData: T[] }) => React.ReactNode);
}

function AnimatedListViewInner<T extends object = Record<string, unknown>>({
  title,
  theme,
  data,
  searchPlaceholder,
  searchSubtext,
  headerControls,
  topControls,
  isLoading,
  onItemClick,
  middleLabel,
  columns,
  viewType = "card",
  hideSubtitle = false,
  hideTitle = false,
  showVideoColumn = false,
  children,
}: AnimatedListViewProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const searchKey = `q_${title}`;
  const search = searchParams.get("q") || searchParams.get(searchKey) || "";

  const setSearch = (val: string) => {
    startTransition(() => {
      setSearchParams(
        (prev) => {
          if (val) {
            prev.set(searchKey, val);
            prev.delete("q");
          } else {
            prev.delete(searchKey);
            prev.delete("q");
          }
          return prev;
        },
        { replace: true, state: location.state },
      );
    });
  };

  const debouncedSearch = useDebounce(search, 300);

  const searchedData = useMemo(() => {
    const term = normalizeForSearch(String(debouncedSearch || ""));
    if (!term) return data;
    const searchTerms = term.split(/[\s,]+/).filter(Boolean);
    return data.filter((item) => {
      const searchable = item as SearchableListItem;
      if (searchable?.isDivider) return true;
      const key = searchable?.searchKey || "";
      return searchTerms.every((t: string) => key.includes(t));
    });
  }, [debouncedSearch, data]);

  const resolvedViewType: "table" | "card" = viewType === "table" ? "table" : "card";

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto">
      <PageHeader title={hideTitle ? undefined : title} theme={theme}>
        {topControls && (
          <div className="flex justify-center w-full">{topControls}</div>
        )}
        <div className="flex flex-col w-full gap-1">
          <div className="flex w-full gap-2 items-center">
            {searchPlaceholder && (
              <ASRSearchInput
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                placeholder={searchPlaceholder}
                theme={theme}
                className="flex-1 w-full"
                enableFocusShortcut="slash"
              />
            )}
            {headerControls}
          </div>
          {searchSubtext && <div>{searchSubtext}</div>}
        </div>
      </PageHeader>

      {children ? (
        typeof children === "function" ? children({ searchedData }) : children
      ) : (
        <ErrorBoundary fallbackMessage="Failed to render the data list.">
          <ASRDataTable
            data={searchedData as unknown as Record<string, unknown>[]}
            isLoading={isLoading}
            viewType={resolvedViewType}
            onItemClick={onItemClick as ((item: Record<string, unknown>) => void) | undefined}
            middleLabel={middleLabel}
            columns={
              (columns || []) as unknown as Array<{
                key: string;
                label: string;
                type?: string;
                isRank?: boolean;
                color?: string;
                width?: string;
                getValue?: (item: Record<string, unknown>) => React.ReactNode;
              }>
            }
            hideSubtitle={hideSubtitle}
            showVideoColumn={showVideoColumn}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

export const AnimatedListView = React.memo(
  AnimatedListViewInner,
) as typeof AnimatedListViewInner;

