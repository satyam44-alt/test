package za.co.santam.cc.contact.santamcard

uses gw.api.util.DateUtil

uses java.io.File
uses java.text.SimpleDateFormat

class AuditDTO {

  var outboundRecord : OutboundRecord as OutboundRecord
  var inboundRecord : InboundRecord as InboundRecord

  property get Type() : String {
    return outboundRecord != null ? "Courier file"
        : inboundRecord != null ? "Confirmation file"
        : "Unknown"
  }

  property get Action() : String {
    return outboundRecord != null ? "File sent"
        : inboundRecord != null ? "File received"
        : "Unknown"
  }

  property get FileName() : String {
    return outboundRecord != null ? new File(outboundRecord.OutboundFile.FileName).NameSansExtension
        : inboundRecord != null ? new File(inboundRecord.InboundFile.InputLocation).NameSansExtension
        : "Unknown"
  }

  property get CreateTime() : Date {
    return outboundRecord != null ? outboundRecord.CreateTime
        : inboundRecord != null ? inboundRecord.CreateTime
        : DateUtil.currentDate().addDays(1)
  }

  property get Timestamp() : String {
    return outboundRecord != null ? new SimpleDateFormat("yyyy-MM-dd hh:mm").format(outboundRecord.CreateDate)
        : inboundRecord != null ? new SimpleDateFormat("yyyy-MM-dd hh:mm").format(inboundRecord.CreateTime)
        : "Unknown"
  }

  property get RecordCount() : Integer {
    return outboundRecord != null ? outboundRecord.Content.split(",").length - 1
        : inboundRecord != null ? inboundRecord.Content.split(",").length - 1
        : -1
  }

  property get Description() : String {
    return getOutboundDescription() ?: getInboundDescription() ?: ""
  }

  private function getOutboundDescription() : String {
    if (outboundRecord == null) return null
    return "outbound description"
  }

  private function getInboundDescription() : String {
    if (inboundRecord == null) return null
    return "inbound description"
  }

}