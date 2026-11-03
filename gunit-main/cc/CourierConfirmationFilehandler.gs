package za.co.santam.cc.contact.santamcard

uses entity.InboundFileConfig
uses gw.api.database.Query
uses gw.api.database.Relop
uses gw.api.inboundfile.BaseInboundFileHandler
uses gw.api.inboundfile.InboundInputFile
uses gw.api.intentionallogging.IntentionalLogger
uses gw.api.util.DateUtil
uses gw.pl.persistence.core.Bundle
uses org.slf4j.Marker
uses za.co.santam.cc.common.SantamLoggers

uses java.io.File

class CourierConfirmationFilehandler extends BaseInboundFileHandler {

  private static final var logger = SantamLoggers.SANTAMCARD

  protected construct(config : InboundFileConfig) {
    super(config)
  }

  override function isFileValid(file : InboundInputFile) : boolean {
    var fileName = file.FileName

    logger.newStructuredLoggerMap(#isFileValid(InboundInputFile))
        .withMessage("Validating inbound file ${fileName}.")
        .logDebug()

    var fileNameSplit = new File(fileName).NameSansExtension.split("_")
    var fileNameIsValid = fileNameSplit.Count == 3 and fileNameSplit.last() == "SantamCourierConfirmation"
    if (not fileNameIsValid) {
      logger.newStructuredLoggerMap(#isFileValid(InboundInputFile))
          .withMessage("Inbound confirmation file ${fileName} has an invalid file name.")
          .logError();
    }

    var fileHasContent = file.FileSize > 0
    if (not fileHasContent) {
      logger.newStructuredLoggerMap(#isFileValid(InboundInputFile))
          .withMessage("Inbound confirmation file ${fileName} has no content.")
          .logError();
    }

    var isFileValid = fileNameIsValid and fileHasContent
    logger.newStructuredLoggerMap(#isFileValid(InboundInputFile))
        .withMessage("Inbound confirmation file ${fileName} is valid: ${isFileValid}")
        .logDebugIfEnabled();

    return isFileValid
  }

  override function process(inboundRecord : InboundRecord, bundle : Bundle, intentionalLogger : IntentionalLogger, marker : Marker) {
    var content = (inboundRecord.Content ?: "").trim()

    if (not content.HasContent) {
      var error = "The content is empty."
      setErrorMessageOnInboundFile(inboundRecord, error)
      return
    }

    var filename = new File(inboundRecord.InboundFile.InputLocation).NameSansExtension
    var confirmationDTOS = getConfirmationDTOsFromContent(content, inboundRecord.InboundFile.DisplayName, \s, lineNumber -> {
      inboundRecord.addToSubRecords(new InboundSubRecord(bundle) {:Content = s ?: "Processed", :LineNumber = lineNumber})
    })

    if (not confirmationDTOS.HasElements) {
      var error = "There are no confirmations."
      setErrorMessageOnInboundFile(inboundRecord, error)
      return
    }

    var infrakeys = confirmationDTOS*.Infrakey

    if (logger.DebugEnabled) {
      logger.newStructuredLoggerMap(#process(InboundRecord, Bundle, IntentionalLogger, Marker))
          .withMessage("Getting Santam cards for ${infrakeys.sort().Count} infrakeys.")
          .addToParameters("inboundRecord", filename)
          .addToObjectList(infrakeys.join(","))
          .logDebug()
    }

    var cards = getCardsForInfrakeys(infrakeys)

    if (logger.DebugEnabled) {
      var infraKeysFromCards = cards
          .map(\elt -> elt.CardHolder.InfraKey_Ext)
          .sort()
          .join(",")
      logger.newStructuredLoggerMap(#process(InboundRecord, Bundle, IntentionalLogger, Marker))
          .withMessage("Retrieved ${cards.Count} Santam cards infrakeys.")
          .addToParameters("inboundRecord", filename)
          .addToObjectList(infraKeysFromCards)
          .logDebug()
    }

    var inceptionDate = DateUtil.currentDate()
    cards.each(\card -> {
      card = bundle.add(card)
      var confirmationDTO = confirmationDTOS.singleWhere(\confirmation -> confirmation.Infrakey == card.CardHolder.InfraKey_Ext)
      card.handleConfirmation(confirmationDTO, inceptionDate)
    })
  }

  private function setErrorMessageOnInboundFile(inboundRecord : InboundRecord, error : String) {
    inboundRecord.InboundFile.ErrorMessage = error
    var filename = new File(inboundRecord.InboundFile.InputLocation).NameSansExtension
    logger.newStructuredLoggerMap(#process(InboundRecord, Bundle, IntentionalLogger, Marker))
        .withMessage(error)
        .addToParameters("inboundRecord", filename)
        .logError()
  }

  static function getCardsForInfrakeys(infrakeys : String[]) : Set<SantamCard_Ext> {
    if (logger.DebugEnabled) {
      logger.newStructuredLoggerMap(#getCardsForInfrakeys(String[]))
          .withMessage("Infrakeys to get cards for. Count: ${infrakeys.Count}")
          .addToObjectList(infrakeys.join(","))
          .logDebug()
    }

    var santamCardHistoryExt = Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#ClaimNumber, Relop.NotEquals, null)
        .compare(SantamCardHistory_Ext#CardStatus, Relop.Equals, SantamCardStatus_Ext.TC_SEND)
        .join(SantamCardHistory_Ext#Card)
        .join(SantamCard_Ext#CardHolder)
        .compareIn(Person#InfraKey_Ext, infrakeys)

    var santamCardExts = santamCardHistoryExt
        .select()
        .reduce(new HashSet<SantamCard_Ext>(), \hashset, historyExt -> {
          if (historyExt.Card.LatestHistory.SendRequest.ClaimNumber != null) {
            hashset.add(historyExt.Card)
          }
          return hashset
        })

    if (logger.DebugEnabled) {
      logger.newStructuredLoggerMap(#getCardsForInfrakeys(String[]))
          .withMessage("Cards selected from infrakeys. Count: ${santamCardExts.Count}")
          .addToObjectList(santamCardExts.map(\elt -> "${elt.CardHolder.InfraKey_Ext} ${elt.LatestHistory.SendRequest.ClaimNumber}").join("\n"))
          .logDebug()
    }

    return santamCardExts
  }

  static function getConfirmationDTOsFromContent(content : String, inboundFileName : String, audit : block(String, Integer) = null) : List<ConfirmationDTO> {
    audit = audit ?: \s, i -> do_nothing(s, i)
    var courierConfirmationSplit = content.split("\n")
        .toList()
    var splitCount = courierConfirmationSplit.Count
    var expectedProcessCount = courierConfirmationSplit.Count - 1
    var tailEntry = courierConfirmationSplit.last() ?: ""

    if (logger.DebugEnabled) {
      logger.newStructuredLoggerMap(#getConfirmationDTOsFromContent(java.lang.String, java.lang.String, block(String, Integer)))
          .withMessage("Creating courier confirmation DTOs.")
          .addToParameters("SplitCount", splitCount)
          .addToParameters("ExpectedProcessCount", expectedProcessCount)
          .addToParameters("TailEntry", tailEntry)
          .logDebug()
    }

    var confirmationIndex = 0
    var confirmationDTOS = courierConfirmationSplit
        .reduce(new ArrayList<ConfirmationDTO>(), \dtos, confirmation -> {
          if (confirmationIndex == (courierConfirmationSplit.Count - 1)) {
            auditTailEntry(tailEntry, confirmationIndex, audit);
            return dtos
          }

          var invalidReason = ConfirmationValidator.isValidConfirmation(confirmation)
          if (invalidReason == null) {
            dtos.add(new ConfirmationDTO(confirmation))
          } else {
            logger.newStructuredLoggerMap(#getConfirmationDTOsFromContent(java.lang.String, java.lang.String, block(String, Integer)))
                .withMessage(invalidReason)
                .addToParameters("index", confirmationIndex)
                .addToParameters("inboundRecord", inboundFileName)
                .logError()
          }
          audit(invalidReason, confirmationIndex)
          confirmationIndex++
          return dtos
        })

    var unprocessedConfirmationCount = (courierConfirmationSplit.Count - 1) - confirmationDTOS.Count
    logger.newStructuredLoggerMap(#getConfirmationDTOsFromContent(java.lang.String, java.lang.String, block(String, Integer)))
        .withMessage("${confirmationDTOS.Count} courier confirmation DTOs created.")
        .addToParameters("SplitCount", splitCount)
        .addToParameters("ExpectedProcessCount", expectedProcessCount)
        .addToParameters("TailEntry", tailEntry)
        .addToParameters("UnprocessedCount", unprocessedConfirmationCount)
        .logInfo()

    return confirmationDTOS
  }

  private static function do_nothing(s : String, i : Integer) {
  }

  private static function auditTailEntry(tailEntry : String, totalConfirmations : int, addAudit : block(String, Integer)) {
    var splitTailEntry = tailEntry.split(",")
    var tailEntryAudit : String = null
    var tailEntryIsValid = splitTailEntry.length == 3
    if (tailEntryIsValid) {
      var totalExpectedConfirmations = Integer.parseInt(splitTailEntry[1])
      tailEntryAudit = totalExpectedConfirmations == totalConfirmations
          ? "Number of records provided match the expected total (${totalExpectedConfirmations})."
          : "The total number of confirmations (${totalConfirmations}) do not match the expected total (${totalExpectedConfirmations})."
    } else {
      tailEntryAudit = "Invalid tail entry. Unable to determine count."
    }
    addAudit(tailEntryAudit, totalConfirmations)
  }
}