package za.co.santam.cc.contact.santamcard

uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.path.Paths

class ConfirmationValidator {

  public static final var INVALID_SPLIT_LENGTH : String = "Splitting the confirmation does not yield an array with a length of 20."
  public static final var INVALID_INFRAKEY : String = "The confirmation does not contain a valid 9 digit Infrakey."
  public static final var INVALID_CARDDELIVERYREQUEST : String = "The confirmation does not contain a valid CardDeliveryRequest/ScenarioFlag."
  public static final var INVALID_CARDRESPONSE : String = "The confirmation does not contain a valid CardResponse."
  public static final var INVALID_CONFIRMATION_PROCESSED : String = "The associated SantamCard is not in a pending status."
  public static final var INVALID_CARDNUMBER : String = "The confirmation does not contain a valid card number."

  /**
   * Validates a confirmation entry
   * If the confirmation entry is not valid, a reason will be returned.
   * If a confirmation entry is valid, null is returned.
   */
  static function isValidConfirmation(confirmationEntry : String) : String {
    var data = (confirmationEntry?.trim() ?: "").split(",")
    if (data.length != 20) {
      return INVALID_SPLIT_LENGTH
    }

    var infraKey = data[0].trim()
    if (infraKey.length() != 9) {
      return INVALID_INFRAKEY
    } else if (cardIsNotInProcessableState(infraKey)) {
      return INVALID_CONFIRMATION_PROCESSED
    }

    var cardDeliveryRequestCode = data[15].trim()
    if (cardDeliveryRequestCode.isBlank()
        or not CardDeliveryRequest_Ext.AllTypeKeys.hasMatch(\elt1 -> elt1.Code == cardDeliveryRequestCode)
        ) {
      return INVALID_CARDDELIVERYREQUEST
    }

    var cardResponse = data[18].trim()
    if (cardResponse.length() != 2) {
      return INVALID_CARDRESPONSE
    }

    var cardNumber = data[16].trim()
    if (cardResponse == "00" and cardNumber.length() != 16) {
      return INVALID_CARDNUMBER
    }

    return null
  }

  private static function cardIsNotInProcessableState(infrakey : String) : boolean {
    var pending = Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#CardStatus, Relop.Equals, SantamCardStatus_Ext.TC_PENDING)
        .join(SantamCardHistory_Ext#Card)
        .join(SantamCard_Ext#CardHolder)
        .compare(Person#InfraKey_Ext, Relop.Equals, infrakey)
        .select({QuerySelectColumns.path(Paths.make(SantamCardHistory_Ext#EffectiveDate))})
        .orderByDescending(QuerySelectColumns.path(Paths.make(SantamCardHistory_Ext#EffectiveDate)))
        .transformQueryRow(\row -> row.getColumn(0) as Date)
        .FirstResult

    if (pending == null) {
      return true
    }

    var notPending = Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#CardStatus, Relop.NotEquals, SantamCardStatus_Ext.TC_PENDING)
        .join(SantamCardHistory_Ext#Card)
        .join(SantamCard_Ext#CardHolder)
        .compare(Person#InfraKey_Ext, Relop.Equals, infrakey)
        .select({QuerySelectColumns.path(Paths.make(SantamCardHistory_Ext#EffectiveDate))})
        .orderByDescending(QuerySelectColumns.path(Paths.make(SantamCardHistory_Ext#EffectiveDate)))
        .transformQueryRow(\row -> row.getColumn(0) as Date)
        .FirstResult

    return notPending != null
        and pending < notPending
  }

}