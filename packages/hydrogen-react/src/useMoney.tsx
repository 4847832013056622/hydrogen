import {useMemo} from 'react';
import {useShop} from './ShopifyProvider.js';
import {CurrencyCode, MoneyV2} from './storefront-api-types.js';

export type UseMoneyValue = {
  /**
   * The currency code from the `MoneyV2` object.
   */
  currencyCode: CurrencyCode;
  /**
   * The name for the currency code, returned by `Intl.NumberFormat`.
   */
  currencyName?: string;
  /**
   * The currency symbol returned by `Intl.NumberFormat`.
   */
  currencySymbol?: string;
  /**
   * The currency narrow symbol returned by `Intl.NumberFormat`.
   */
  currencyNarrowSymbol?: string;
  /**
   * The localized amount, without any currency symbols or non-number types from the `Intl.NumberFormat.formatToParts` parts.
   */
  amount: string;
  /**
   * All parts returned by `Intl.NumberFormat.formatToParts`.
   */
  parts: Intl.NumberFormatPart[];
  /**
   * A string returned by `new Intl.NumberFormat` for the amount and currency code,
   * using the `locale` value in the [`LocalizationProvider` component](https://shopify.dev/api/hydrogen/components/localization/localizationprovider).
   */
  localizedString: string;
  /**
   * The `MoneyV2` object provided as an argument to the hook.
   */
  original: MoneyV2;
  /**
   * A string with trailing zeros removed from the fractional part, if any exist. If there are no trailing zeros, then the fractional part remains.
   * For example, `$640.00` turns into `$640`.
   * `$640.42` remains `$640.42`.
   */
  withoutTrailingZeros: string;
  /**
   * A string without currency and without trailing zeros removed from the fractional part, if any exist. If there are no trailing zeros, then the fractional part remains.
   * For example, `$640.00` turns into `640`.
   * `$640.42` turns into `640.42`.
   */
  withoutTrailingZerosAndCurrency: string;
};

/**
 * The `useMoney` hook takes a [MoneyV2 object](https://shopify.dev/api/storefront/reference/common-objects/moneyv2) and returns a
 * default-formatted string of the amount with the correct currency indicator, along with some of the parts provided by
 * [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).
 * Uses `locale` from `ShopifyProvider`
 * &nbsp;
 * @see {@link https://shopify.dev/api/hydrogen/hooks/usemoney}
 * @example initialize the money object
 * ```ts
 * const money = useMoney({
 *   amount: '100.00',
 *   currencyCode: 'USD'
 * })
 * ```
 * &nbsp;
 *
 * @example basic usage, outputs: $100.00
 * ```ts
 * money.localizedString
 * ```
 * &nbsp;
 *
 * @example without currency, outputs: 100.00
 * ```ts
 * money.amount
 * ```
 * &nbsp;
 *
 * @example without trailing zeros, outputs: $100
 * ```ts
 * money.withoutTrailingZeros
 * ```
 * &nbsp;
 *
 * @example currency name, outputs: US dollars
 * ```ts
 * money.currencyCode
 * ```
 * &nbsp;
 *
 * @example currency symbol, outputs: $
 * ```ts
 * money.currencySymbol
 * ```
 * &nbsp;
 *
 * @example without currency and without trailing zeros, outputs: 100
 * ```ts
 * money.withoutTrailingZerosAndCurrency
 * ```
 */
export function useMoney(money: MoneyV2): UseMoneyValue {
  const {countryIsoCode, languageIsoCode} = useShop();
  const locale = `${languageIsoCode}-${countryIsoCode}`;

  if (!locale) {
    throw new Error(
      `useMoney(): Unable to get 'locale' from 'useShop()', which means that 'locale' was not passed to '<ShopifyProvider/>'. 'locale' is required for 'useMoney()' to work`,
    );
  }

  const amount = parseFloat(money.amount);

  const options = useMemo(
    () => ({
      style: 'currency',
      currency: money.currencyCode,
    }),
    [money.currencyCode],
  );

  const defaultFormatter = useLazyFormatter(locale, options);

  const nameFormatter = useLazyFormatter(locale, {
    ...options,
    currencyDisplay: 'name',
  });

  const narrowSymbolFormatter = useLazyFormatter(locale, {
    ...options,
    currencyDisplay: 'narrowSymbol',
  });

  const withoutTrailingZerosFormatter = useLazyFormatter(locale, {
    ...options,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const withoutCurrencyFormatter = useLazyFormatter(locale);

  const withoutTrailingZerosOrCurrencyFormatter = useLazyFormatter(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const isPartCurrency = (part: Intl.NumberFormatPart): boolean =>
    part.type === 'currency';

  // By wrapping these properties in functions, we only
  // create formatters if they are going to be used.
  const lazyFormatters = useMemo(
    () => ({
      original: () => money,
      currencyCode: () => money.currencyCode,

      localizedString: () => defaultFormatter().format(amount),

      parts: () => defaultFormatter().formatToParts(amount),

      withoutTrailingZeros: () =>
        amount % 1 === 0
          ? withoutTrailingZerosFormatter().format(amount)
          : defaultFormatter().format(amount),

      withoutTrailingZerosAndCurrency: () =>
        amount % 1 === 0
          ? withoutTrailingZerosOrCurrencyFormatter().format(amount)
          : withoutCurrencyFormatter().format(amount),

      currencyName: () =>
        nameFormatter().formatToParts(amount).find(isPartCurrency)?.value ??
        money.currencyCode, // e.g. "US dollars"

      currencySymbol: () =>
        defaultFormatter().formatToParts(amount).find(isPartCurrency)?.value ??
        money.currencyCode, // e.g. "USD"

      currencyNarrowSymbol: () =>
        narrowSymbolFormatter().formatToParts(amount).find(isPartCurrency)
          ?.value ?? '', // e.g. "$"

      amount: () =>
        defaultFormatter()
          .formatToParts(amount)
          .filter((part) =>
            ['decimal', 'fraction', 'group', 'integer', 'literal'].includes(
              part.type,
            ),
          )
          .map((part) => part.value)
          .join(''),
    }),
    [
      money,
      amount,
      nameFormatter,
      defaultFormatter,
      narrowSymbolFormatter,
      withoutCurrencyFormatter,
      withoutTrailingZerosFormatter,
      withoutTrailingZerosOrCurrencyFormatter,
    ],
  );

  // Call functions automatically when the properties are accessed
  // to keep these functions as an implementation detail.
  return useMemo(
    () =>
      new Proxy(lazyFormatters as unknown as UseMoneyValue, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        get: (target, key) => Reflect.get(target, key)?.call(null),
      }),
    [lazyFormatters],
  );
}

function useLazyFormatter(
  locale: string,
  options?: Intl.NumberFormatOptions,
): () => Intl.NumberFormat {
  return useMemo(() => {
    let memoized: Intl.NumberFormat;
    return () => (memoized ??= new Intl.NumberFormat(locale, options));
  }, [locale, options]);
}
