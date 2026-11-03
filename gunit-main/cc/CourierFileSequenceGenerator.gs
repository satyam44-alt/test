package za.co.santam.cc.contact.santamcard

uses gw.api.system.database.SequenceUtil
uses gw.api.util.DateUtil
uses gw.api.util.StringUtil


class CourierFileSequenceGenerator {
  static function getNextNumber() : Long {
    var initialValue = ScriptParameters.SantamCardCourierFileSequenceNumber
    var sequenceKey = ScriptParameters.SantamCardCourierFileSequenceName
    var nextNumber = SequenceUtil.next(initialValue, sequenceKey)
    return nextNumber
  }

  static function getNextFileName() : String {
    var fileSequenceNumber = getNextNumber()
    var date = StringUtil.formatDate(DateUtil.currentDate(), "yyyyMMdd")
    var fileName = "${fileSequenceNumber}_${date}_SANTAMCOURIER"
    return fileName
  }
}
