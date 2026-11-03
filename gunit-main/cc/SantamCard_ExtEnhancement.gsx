package za.co.santam.cc.contact.santamcard

uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.locale.DisplayKey
uses gw.api.path.Paths
uses gw.api.util.DateUtil
uses gw.api.util.DisplayableException
uses gw.surepath.suite.integration.logging.StructuredLogger
uses za.co.santam.cc.common.SantamLoggers
uses za.co.santam.cc.util.SantamConstants

uses java.text.Normalizer

enhancement SantamCard_ExtEnhancement : SantamCard_Ext {

  private property get logger() : StructuredLogger {
    return SantamLoggers.SANTAMCARD
  }

  property get LatestHistory() : SantamCardHistory_Ext {
    return this.History
        .orderByDescending(\e -> e.EffectiveDate)
        .first()
  }

  property get CardStatus() : SantamCardStatus_Ext {
    return LatestHistory?.CardStatus
  }

  property get CardResponse() : SantamCardResponse_Ext {
    return LatestHistory?.CardResponse
  }

  property get DateCardRequested() : Date {
    return this.LatestHistory?.SendRequest?.EffectiveDate
  }

  property get InceptionDate() : Date {
    return this.CardStatus == SantamCardStatus_Ext.TC_ACTIVE
        ? this.LatestHistory.EffectiveDate
        : null
  }

  property get ClaimNumber() : String {
    return LatestHistory?.SendRequest?.ClaimNumber
  }

  property get CardNumber() : String {
    return LatestHistory?.CardNumber
  }

  property get CourierFileEntry() : String {
    return {
        format(this.CardHolder.InfraKey_Ext, 9),
        clean(this.CardHolder.FirstName, 30),
        format(this.CardHolder.LastName, 30),
        format(this.CardHolder.TaxID, 13),
        format(this.CardHolder.PassportNumber, 20),
        format(this.DeliveryAddress.AddressLine1, 100),
        format(this.DeliveryAddress.AddressLine2, 100),
        format(this.DeliveryAddress.Suburb_Ext, 100),
        format(this.DeliveryAddress.City, 100),
        format(this.DeliveryAddress.PostalCode, 10),
        format(this.DeliveryAddress.Province_Ext, 20),
        format(this.WorkPhone, 10),
        format(this.HomePhone, 10),
        format(this.CellPhone, 10),
        "", // email which must be empty / is unused.
        format(this.CardDeliveryRequest.Code, 1)
    }.join(",").trim()
  }

  private function format(o : Object, i : Integer) : String {
    return (o?.toString() ?: "").trim().trimToLength(i)
  }

  private function clean(s : String, i : Integer) : String {
    var formatted = format(s, i)
    return Normalizer.normalize(formatted, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replaceAll("[^A-Za-z]", "")
  }

  property get ClaimNumberSet() : Set<String> {
    return this.History.map(\elt -> elt.ClaimNumber)
        .where(\elt -> elt != null)
        .toSet()
  }

  function validate() {
    var santamCard = this
    if (santamCard.HomePhoneCountry != null and santamCard.HomePhoneCountry != PhoneCountryCode.TC_ZA) {
      throw new DisplayableException(DisplayKey.get("Web.AddressBook.ContactDetail.ScreenTab.SantamCard.InvalidCountryCode.Phone", PrimaryPhoneType.TC_HOME))
    }
    if (santamCard.WorkPhoneCountry != null and santamCard.WorkPhoneCountry != PhoneCountryCode.TC_ZA) {
      throw new DisplayableException(DisplayKey.get("Web.AddressBook.ContactDetail.ScreenTab.SantamCard.InvalidCountryCode.Phone", PrimaryPhoneType.TC_WORK))
    }
    if (santamCard.CellPhoneCountry != null and santamCard.CellPhoneCountry != PhoneCountryCode.TC_ZA) {
      throw new DisplayableException(DisplayKey.get("Web.AddressBook.ContactDetail.ScreenTab.SantamCard.InvalidCountryCode.Phone", PrimaryPhoneType.TC_MOBILE))
    }
    if (santamCard.DeliveryAddress.Country != Country.TC_ZA) {
      throw new DisplayableException(DisplayKey.get("Web.AddressBook.ContactDetail.ScreenTab.SantamCard.InvalidCountryCode.Address"))
    }
  }

  function issueSantamCard(claimNumber : String) {
    validate()
    if ({SantamCardStatus_Ext.TC_ACTIVE, SantamCardStatus_Ext.TC_ERROR, null}.contains(this.LatestHistory?.CardStatus)) {
      this.addToHistory(new SantamCardHistory_Ext() {
        :CardStatus = SantamCardStatus_Ext.TC_SEND,
        :RequestedBy = User.util.CurrentUser.DisplayName,
        :EffectiveDate = DateUtil.currentDate(),
        :CardType = this.History.HasElements ? SantamCardType_Ext.TC_REPLACE : SantamCardType_Ext.TC_NEW,
        :CardDeliveryRequest = this.CardDeliveryRequest,
        :ClaimNumber = claimNumber
      })
      closeSantamCardUnsuccessfulDeliveryActivity()
    }
  }

  function handleConfirmation(confirmation : ConfirmationDTO, inceptionDate : Date) {
    if (this.LatestHistory?.CardStatus == SantamCardStatus_Ext.TC_PENDING) {
      this.addToHistory(new SantamCardHistory_Ext() {
        :CardStatus = confirmation.CardStatus,
        :CardDeliveryRequest = confirmation.CardDeliveryRequest,
        :EffectiveDate = inceptionDate,
        :CardResponse = confirmation.CardResponse,
        :CardNumber = confirmation.CardNumber,
        :CardType = this.LatestHistory.CardType,
        :ClaimNumber = this.LatestHistory.SendRequest.ClaimNumber
      })

      closeSantamCardPendingStatusActivity()

      if (this.CardStatus == SantamCardStatus_Ext.TC_ERROR) {
        createSantamCardUnsuccessfulActivity()
      }
    }
  }

  function moveToPending(effectiveDate : Date) {
    if (this.LatestHistory?.CardStatus == SantamCardStatus_Ext.TC_SEND) {
      this.addToHistory(new SantamCardHistory_Ext() {
        :CardStatus = SantamCardStatus_Ext.TC_PENDING,
        :CardType = this.LatestHistory.CardType,
        :EffectiveDate = effectiveDate,
        :ClaimNumber = this.LatestHistory.SendRequest.ClaimNumber
      })
    }
  }

  function closeSantamCardUnsuccessfulDeliveryActivity() {
    completeAnyOpenActivityForActivityPatternByCode(SantamConstants.SANTAM_CARD_UNSUCCESSFUL_DELIVERY)
  }

  function closeSantamCardPendingStatusActivity() {
    completeAnyOpenActivityForActivityPatternByCode(SantamConstants.SANTAM_CARD_IN_PENDING_STATUS)
  }

  private function completeAnyOpenActivityForActivityPatternByCode(code : String) {
    var infrakey = this.CardHolder.InfraKey_Ext

    var claimNumbers = Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#ClaimNumber, Relop.NotEquals, null)
        .join(SantamCardHistory_Ext#Card)
        .join(SantamCard_Ext#CardHolder)
        .compare(Person#InfraKey_Ext, Relop.Equals, infrakey)
        .withDistinct(true)
        .select({QuerySelectColumns.path(Paths.make(SantamCardHistory_Ext#ClaimNumber))})
        .transformQueryRow(\row -> row.getColumn(0).toString())
        .toSet()

    logger.newStructuredLoggerMap(#completeAnyOpenActivityForActivityPatternByCode(String))
        .withMessage("Completing any open ${code} activities on ${claimNumbers.Count} claims for card holder.")
        .addToParameters("infrakey", infrakey)
        .addToObjectList(claimNumbers.join(","))
        .logDebugIfEnabled()

    Query.make(Activity)
        .compare(Activity#ActivityPattern, Relop.Equals, ActivityPattern.finder.getActivityPatternByCode(code))
        .compare(Activity#Status, Relop.Equals, ActivityStatus.TC_OPEN)
        .join(Activity#Claim)
        .compareIn(Claim#ClaimNumber, claimNumbers.toTypedArray())
        .compare(Claim#State, Relop.Equals, ClaimState.TC_OPEN)
        .select()
        .each(\activity -> {
          activity = this.Bundle.add(activity)
          gw.transaction.Transaction.asUserOnlyExecute(User.util.UnrestrictedUser, \-> activity.complete())
          if (logger.DebugEnabled) {
            logger.newStructuredLoggerMap(#completeAnyOpenActivityForActivityPatternByCode(String))
                .withMessage("Activity ${activity.ID} completed for claim ${activity.Claim.ClaimNumber}.")
                .addToParameters("infrakey", infrakey)
                .logDebug()
          }
        })
  }

  function createSantamCardUnsuccessfulActivity() {
    if (not this.ClaimNumber.HasContent) {
      return
    }

    var claim = Claim.finder.findClaimByClaimNumber(this.ClaimNumber)
    if (claim == null) {
      return;
    }

    var activityPattern = ActivityPattern.finder.getActivityPatternByCode(SantamConstants.SANTAM_CARD_UNSUCCESSFUL_DELIVERY)
    if (claim.OpenActivities.hasMatch(\elt1 -> elt1.ActivityPattern == activityPattern)) {
      return;
    }

    var activity = this.Bundle.add(claim).createActivityFromPattern(null, activityPattern)
    activity.assignToClaimOwner()
  }
}
