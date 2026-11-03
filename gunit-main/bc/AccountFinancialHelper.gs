package gw.account

uses gw.api.domain.accounting.ChargePatternKey
uses gw.pl.currency.MonetaryAmount

@Export
class SantamAccountFinancialHelper_Ext {
  static function calculateLateFees(account : Account) : MonetaryAmount {
    final var lateFeePatterns =
        {ChargePatternKey.ACCOUNTLATEFEE.get(),
            ChargePatternKey.POLICYLATEFEE.get()}
    final var lateFees = account.getChargesRelatedToAccount(TC_OWNED)
        .where(\ charge -> lateFeePatterns.contains(charge.ChargePattern)
            and not (charge.Reversed or charge.Reversal))
    final var total = lateFees.flatMap(\ lateCharge -> lateCharge.InvoiceItems)
        .sum(account.Currency,
            \ lateChargeInvoiceItem -> lateChargeInvoiceItem.GrossUnsettledAmount)

    return total.IsNegative ? 0bd.ofCurrency(total.Currency) : total
  }
}