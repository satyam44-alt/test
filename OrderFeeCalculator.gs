package demo.gunit

/**
 * Simple Gosu source used to test parsing, scenario planning,
 * GUnit generation, and static validation.
 */
class OrderFeeCalculator {

  /**
   * Calculates a delivery fee from the order amount and customer type.
   *
   * Rules:
   * - Negative order amounts are invalid.
   * - Orders of 1000 or more receive free delivery.
   * - PREMIUM customers pay a reduced fee.
   * - STANDARD customers pay the normal fee.
   * - Unknown or null customer types use the default fee.
   */
  function calculateDeliveryFee(orderAmount : int, customerType : String) : int {
    if (orderAmount < 0) {
      throw new IllegalArgumentException("Order amount cannot be negative")
    }

    if (orderAmount >= 1000) {
      return 0
    }

    if (customerType == null) {
      return 100
    }

    switch (customerType) {
      case "PREMIUM":
        return calculatePremiumFee(orderAmount)
      case "STANDARD":
        return 100
      default:
        return 150
    }
  }

  /**
   * Returns whether an order qualifies for free delivery.
   */
  function qualifiesForFreeDelivery(orderAmount : int) : boolean {
    return orderAmount >= 1000
  }

  /**
   * Private implementation detail. Tests should cover this through
   * calculateDeliveryFee rather than calling it directly.
   */
  private function calculatePremiumFee(orderAmount : int) : int {
    if (orderAmount >= 500) {
      return 25
    }
    return 50
  }
}
