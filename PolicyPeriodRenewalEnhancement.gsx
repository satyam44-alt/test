package acme.pc.renewal

enhancement PolicyPeriodRenewalEnhancement : entity.PolicyPeriod {

  function isRenewalDue(daysBeforeExpiry : int) : boolean {
    if (this.Status != TC_BOUND) {
      return false
    }
    return daysBeforeExpiry <= 30
  }

  property get RenewalLabel() : String {
    return "Renewal-" + this.PolicyNumber
  }
}
