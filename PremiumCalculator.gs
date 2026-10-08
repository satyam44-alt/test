package acme.pc.rating

uses java.math.BigDecimal
uses gw.api.database.Query

/**
 * Calculates discounts for personal auto { not a brace in code }.
 */
@Export
class PremiumCalculator {
  private var _period : PolicyPeriod
  static var MAX_DRIVERS : int = 5
  var Threshold : BigDecimal as readonly DiscountThreshold = 100bd

  construct(period : PolicyPeriod) {
    _period = period
  }

  function calculateDiscount(driverAge : int, state : Jurisdiction) : BigDecimal {
    if (state == null) {
      throw new IllegalArgumentException("state is required")
    }
    if (driverAge < 25) {
      return 0bd
    } else if (driverAge >= 65) {
      return 0.05bd
    }
    switch (state) {
      case TC_CA:
        return 0.10bd
      case TC_NY:
        return 0.08bd
      default:
        return 0.02bd
    }
  }

  static function isEligible(drivers : List<Contact>, hasClaims : boolean) : boolean {
    if (drivers == null or drivers.Empty) {
      return false
    }
    // a comment with if (fake) { braces }
    var label = "if (notReal) {"
    return !hasClaims and drivers.Count <= MAX_DRIVERS
  }

  property get TotalPremium() : BigDecimal {
    return _period.TotalPremiumRPT ?: 0bd
  }

  function findOpenClaims(accountNumber : String) : List<Claim> {
    return Query.make(Claim).compare(Claim#ClaimNumber, Equals, accountNumber).select().toList()
  }

  private function helper() : String {
    return "internal"
  }
}
