'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Direction, WorkField } from '@/gql/graphql';

import useEntityList from './useEntityList';

type ExtraParamConfig<T> = {
  key: string;
  defaultValue: T;
  parse: (raw: string) => T;
  serialize: (val: T) => string;
};

type ExtraParamsConfig = Record<string, ExtraParamConfig<string>>;

type UseFilterSearchParamsOptions<E extends ExtraParamsConfig = ExtraParamsConfig> = {
  defaults?: {
    direction?: Direction;
    orderBy?: WorkField;
  };
  extraParams?: E;
};

type ExtraState<E extends ExtraParamsConfig> = {
  [K in keyof E]: ReturnType<E[K]['parse']>;
};

type ExtraSetters<E extends ExtraParamsConfig> = {
  [K in keyof E]: (value: ReturnType<E[K]['parse']>) => void;
};

const parseEnum = <T extends string>(raw: string | null, validValues: readonly T[], fallback: T): T => {
  if (raw && (validValues as readonly string[]).includes(raw)) {
    return raw as T;
  }

  return fallback;
};

const DIRECTION_VALUES = Object.values(Direction) as Direction[];
const WORK_FIELD_VALUES = Object.values(WorkField) as WorkField[];

/**
 * Hook that syncs entity list filter state with URL search params.
 *
 * On mount, reads search params from the URL and uses them as initial filter values.
 * On state change, writes non-default filter values back to the URL via router.replace.
 *
 * Wraps useEntityList for core filters (page, direction, orderBy, search) and
 * supports entity-specific filters via the extraParams config (e.g. workStatus, seriesType).
 *
 * Changing any filter (except page) automatically resets pagination to page 1.
 * Only non-default values are written to the URL to keep it clean.
 * Uses the debounced search value for the URL param, not the raw input value.
 */
const useFilterSearchParams = <E extends ExtraParamsConfig = Record<string, never>>(
  options: UseFilterSearchParamsOptions<E> = {},
) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isInitialRender = useRef(true);
  const lastParamsString = useRef('');

  const defaultDirection = options.defaults?.direction ?? Direction.Asc;
  const defaultOrderBy = options.defaults?.orderBy ?? WorkField.UpdatedAt;

  // Parse URL params once on mount to initialize filter state
  const initialValues = useMemo(() => {
    const page = parseInt(searchParams.get('page') ?? '1', 10) || 1;
    const direction = parseEnum(searchParams.get('direction'), DIRECTION_VALUES, defaultDirection);
    const orderBy = parseEnum(searchParams.get('orderBy'), WORK_FIELD_VALUES, defaultOrderBy);
    const search = searchParams.get('search') ?? '';

    const extras = {} as Record<string, string>;

    if (options.extraParams) {
      for (const [stateKey, config] of Object.entries(options.extraParams)) {
        const raw = searchParams.get(config.key);
        extras[stateKey] = raw !== null ? config.parse(raw) : config.defaultValue;
      }
    }

    return { page, direction, orderBy, search, extras };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entityList = useEntityList({
    initialActivePage: initialValues.page,
    initialDirection: initialValues.direction,
    initialOrderBy: initialValues.orderBy,
    initialSearchValue: initialValues.search,
  });

  // Entity-specific filter state (e.g. workStatus, workType, seriesType)
  const [extraState, setExtraState] = useState<Record<string, string>>(initialValues.extras);

  // Memoized setters for extra params — each setter also resets page to 1
  const extraSetters = useMemo(() => {
    const setters = {} as Record<string, (value: string) => void>;

    if (options.extraParams) {
      for (const stateKey of Object.keys(options.extraParams)) {
        setters[stateKey] = (value: string) => {
          setExtraState((prev) => ({ ...prev, [stateKey]: value }));
          entityList.changePage(1);
        };
      }
    }

    return setters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrapped setters that reset page to 1 on filter change
  const changeDirection = (value: Direction) => {
    entityList.changeDirection(value);
    entityList.changePage(1);
  };

  const changeOrderBy = (value: WorkField) => {
    entityList.changeOrderBy(value);
    entityList.changePage(1);
  };

  const changeSearchValue = (value: string) => {
    entityList.changeSearchValue(value);
    entityList.changePage(1);
  };

  // Sync state -> URL: builds search params from current state, skips defaults,
  // and replaces the URL. Skipped on initial render (URL already has correct params).
  // Uses lastParamsString ref to avoid redundant router.replace calls.
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const params = new URLSearchParams();

    if (entityList.activePage !== 1) params.set('page', String(entityList.activePage));
    if (entityList.direction !== defaultDirection) params.set('direction', entityList.direction);
    if (entityList.orderBy !== defaultOrderBy) params.set('orderBy', entityList.orderBy);
    if (entityList.debouncedValue !== '') params.set('search', entityList.debouncedValue);

    if (options.extraParams) {
      for (const [stateKey, config] of Object.entries(options.extraParams)) {
        const val = extraState[stateKey];

        if (val === config.defaultValue) continue;

        params.set(config.key, config.serialize(val));
      }
    }

    const paramsString = params.toString();

    if (paramsString === lastParamsString.current) return;

    lastParamsString.current = paramsString;

    const url = paramsString ? `${pathname}?${paramsString}` : pathname;

    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityList.activePage, entityList.direction, entityList.orderBy, entityList.debouncedValue, extraState]);

  return {
    ...entityList,
    extraState: extraState as ExtraState<E>,
    changeExtra: extraSetters as ExtraSetters<E>,
    changeDirection,
    changeOrderBy,
    changeSearchValue,
  };
};

export default useFilterSearchParams;
