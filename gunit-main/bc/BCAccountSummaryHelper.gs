package gw.web.account


/**
 * Encapsulates the value and display logic used to display the information
 * for an {@link entity.Account Account} on a summary display.
 */
@Export
class AccountSummaryHelper extends SummaryHelper {

  var _account : Account as readonly Account

  public construct(account: Account) {
    super()
    _account = account
  }

  override final property get HasActiveTarget() : boolean {
    return not _account.Closed
  }

  override property get InceptionDate() : Date {
    return _account.CreateTime
  }

  override property get DelinquencyProcesses() : DelinquencyProcess[] {
    return _account.DelinquencyProcesses
  }

  function getPhoneEmailDisplayValue(contact : Contact) : String {
    var phoneNumber = contact.PrimaryPhoneValue != null
        ? contact.PrimaryPhoneValue
        : "-"

    var email = contact.EmailAddress1 != null
        ? contact.EmailAddress1
        : "-"

    return "${phoneNumber} / ${email}"
  }

  override property get RecentDelinquenciesTooltip() : String {
    if (_account.hasActiveDelinquencyProcess()) {
      return "This account is currently delinquent"
    }

    var recent = RecentDelinquenciesCount

    if (recent == 0) {
      return "There was no delinquency on this account in th..."
    } else if (recent == 1) {
      return "There was a delinquency on this account in the..."
    }

    return "There were delinquencies on this account in th..."
  }

  override function makeDelinquenciesQuery() : Query<DelinquencyProcess> {
    final var delinquenciesQuery = Query.make(DelinquencyProcess)
    delinquenciesQuery.compare(
        DelinquencyProcess#Account,
        Equals,
        _account)

    return delinquenciesQuery
  }

  override function makeRecentDelinquenciesQuery() : Query<DelinquencyProcess> {
    return makeDelinquenciesQuery()
  }

  property get ServiceTierIcon() : String {
    return BCIconHelper.getIcon(_account.ServiceTier)
  }

  property get ServiceTierTooltip() : String {
    switch (_account.ServiceTier) {
      case CustomerServiceTier.TC_GOLD:
        return "Gold"

      case CustomerServiceTier.TC_PLATINUM:
        return "Platinum"

      case CustomerServiceTier.TC_SILVER:
        return "Silver"

      default:
        return ""
    }
  }
}