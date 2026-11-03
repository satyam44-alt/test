package za.co.santam.cc.contact.santamcard

uses gw.api.database.DBFunction
uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.path.Paths
uses gw.api.util.DateUtil
uses gw.pl.persistence.core.Key
uses gw.processes.BatchProcessBase
uses gw.surepath.suite.integration.logging.StructuredLogger
uses za.co.santam.cc.common.SantamLoggers
uses za.co.santam.cc.util.SantamConstants

class SantamCardStatusPendingActivityBatch extends BatchProcessBase {

  private static final var logger = SantamLoggers.SANTAMCARD

  construct() {
    super(BatchProcessType.TC_SANTAMCARDSTATUSACTIVITYBATCH_EXT)
  }

  protected override function doWork() {
    var claims = getClaimsForExpiredPendingSantamCards()

    createExpiredPendingStatusActivitiesForClaims(claims);
  }

  static function createExpiredPendingStatusActivitiesForClaims(claimsToCreateActivitiesFor : Set<Claim>) {
    logger.newStructuredLoggerMap(#createExpiredPendingStatusActivitiesForClaims(Set<Claim>))
        .withMessage("Creating activities for ${claimsToCreateActivitiesFor.Count} claims.")
        .logDebugIfEnabled()

    var pendingSantamCardActivityPattern = ActivityPattern.finder.getActivityPatternByCode(SantamConstants.SANTAM_CARD_IN_PENDING_STATUS)
    gw.transaction.Transaction.runWithNewBundle(\bundle -> {
      claimsToCreateActivitiesFor
          .each(\claim -> {
            if (not claim.OpenActivities.hasMatch(\elt1 -> elt1.ActivityPattern == pendingSantamCardActivityPattern)) {
              claim = bundle.add(claim)
              var activity = claim.createActivityFromPattern(null, pendingSantamCardActivityPattern)
              activity.assignToClaimOwner()
              logger.newStructuredLoggerMap(#createExpiredPendingStatusActivitiesForClaims(Set<Claim>))
                  .withMessage("Activity created for claim ${claim.ClaimNumber}.")
                  .logDebugIfEnabled()
            }
          })
    }, User.util.CurrentUser)
  }

  static function getClaimsForExpiredPendingSantamCards() : Set<Claim> {
    var santamCardMaxPendingDays = ScriptParameters.SantamCardMaxPendingDays
    var expiryDate = DateUtil.currentDate()

    logger.newStructuredLoggerMap(#getClaimsForExpiredPendingSantamCards())
        .withMessage("Getting claims for expired pending items...")
        .addToParameters("santamCardMaxPendingDays", santamCardMaxPendingDays)
        .addToParameters("expiryDate", expiryDate)
        .logDebugIfEnabled()

    var santamCardHistoryExtQuery = Query.make(SantamCardHistory_Ext)
    var effectDateColumn = santamCardHistoryExtQuery.getColumnRef(SantamCardHistory_Ext#EffectiveDate.PropertyInfo.Name)
    var expiredDateDbFunction = DBFunction.Expr({effectDateColumn, "::DATE + ${santamCardMaxPendingDays}"})

    var pending = santamCardHistoryExtQuery.compare(SantamCardHistory_Ext#CardStatus, Relop.Equals, SantamCardStatus_Ext.TC_PENDING)
        .compare(SantamCardHistory_Ext#ClaimNumber, Relop.NotEquals, null)
        .compare(expiredDateDbFunction, Relop.LessThan, expiryDate)
        .select({
            QuerySelectColumns.pathWithAlias("Card", Paths.make(SantamCardHistory_Ext#Card)),
            QuerySelectColumns.dbFunctionWithAlias("LatestPendingHistory", DBFunction.Max(Paths.make(SantamCardHistory_Ext#ID)))
        })
        .reduce(new HashMap<Long, Long>(), \pending, row -> {
          var card = Long.parseLong(row.getColumn("Card").toString())
          var latestPendingHistory = Long.parseLong(row.getColumn("LatestPendingHistory").toString())
          pending[card] = latestPendingHistory
          return pending
        })

    logger.newStructuredLoggerMap(#getClaimsForExpiredPendingSantamCards())
        .withMessage("Number of pending expired records: ${pending.Count}")
        .logDebugIfEnabled()

    var expired = Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#CardStatus, Relop.NotEquals, SantamCardStatus_Ext.TC_PENDING)
        .compareIn(SantamCardHistory_Ext#Card, pending.Keys.map(\elt -> new Key(SantamCard_Ext, elt)).toTypedArray())
        .select({
            QuerySelectColumns.pathWithAlias("Card", Paths.make(SantamCardHistory_Ext#Card)),
            QuerySelectColumns.dbFunctionWithAlias("LatestNonPendingHistory", DBFunction.Max(Paths.make(SantamCardHistory_Ext#ID)))
        })
        .reduce(new ArrayList<Long>(), \expiredList, row -> {
          var card = Long.parseLong(row.getColumn("Card").toString())
          var latestNonPendingHistory = Long.parseLong(row.getColumn("LatestNonPendingHistory").toString())
          var latestPendingHistory = pending[card]
          if (latestPendingHistory > latestNonPendingHistory) {
            expiredList.add(pending[card])
          }
          return expiredList
        })
        .map(\elt -> new Key(SantamCardHistory_Ext, elt))
        .toTypedArray()

    logger.newStructuredLoggerMap(#getClaimsForExpiredPendingSantamCards())
        .withMessage("Number of existing expired records: ${expired.Count}")
        .logDebugIfEnabled()

    var claimNumbersOfExpiredPendingCard = Query.make(SantamCardHistory_Ext)
        .compareIn(SantamCardHistory_Ext#ID, expired)
        .select({QuerySelectColumns.path(Paths.make(SantamCardHistory_Ext#ClaimNumber))})
        .transformQueryRow(\row -> row.getColumn(0).toString())
        .toSet()
        .toTypedArray()

    logger.newStructuredLoggerMap(#getClaimsForExpiredPendingSantamCards())
        .withMessage("Number of claims identified: ${claimNumbersOfExpiredPendingCard.Count}")
        .logDebugIfEnabled()

    var pendingSantamCardActivityPattern = ActivityPattern.finder.getActivityPatternByCode(SantamConstants.SANTAM_CARD_IN_PENDING_STATUS)

    var claimsThatAlreadyHaveActivities = Query.make(Activity)
        .compare(Activity#Status, Relop.Equals, ActivityStatus.TC_OPEN)
        .compare(Activity#ActivityPattern, Relop.Equals, pendingSantamCardActivityPattern)
        .join(Activity#Claim)
        .compareIn(Claim#ClaimNumber, claimNumbersOfExpiredPendingCard)
        .select({QuerySelectColumns.path(Paths.make(Activity#Claim))})
        .map(\elt -> elt.getColumn(0) as Key)
        .toTypedArray()

    logger.newStructuredLoggerMap(#getClaimsForExpiredPendingSantamCards())
        .withMessage("Number of claims that already have activities: ${claimsThatAlreadyHaveActivities.Count}")
        .logDebugIfEnabled()

    var claimsToCreateActivitiesFor = Query.make(Claim)
        .compareIn(Claim#ClaimNumber, claimNumbersOfExpiredPendingCard)
        .compareNotIn(Claim#ID, claimsThatAlreadyHaveActivities)
        .select()
        .toSet()

    logger.newStructuredLoggerMap(#getClaimsForExpiredPendingSantamCards())
        .withMessage("Number of claims to create activities for: ${claimsToCreateActivitiesFor.Count}")
        .logDebugIfEnabled()

    return claimsToCreateActivitiesFor
  }

}