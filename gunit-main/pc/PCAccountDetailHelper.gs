package gw.api.web.dashboard.ui.account



@Export
class AccountDetailHelper {

  final var _account: Account as readonly Account

  construct(account: Account) {
    _account = Preconditions.checkNotNull(account)
  }

  property get AddressLabel(): String {
    var address = _account.AccountHolderContact.PrimaryAddress
    return "{address.AddressType.DisplayName} Address"
  }

  property get Address(): String {
    var address = _account.AccountHolderContact.PrimaryAddress
    var addressOwner = new AddressInputSetAddressOwner(address, false, true)
    return new AddressFormatter().format(addressOwner.AddressDelegate, "\n")
  }

  property get AddressDescription(): String {
    return _account.AccountHolderContact.PrimaryAddress.Description
  }

  function editAccount() {
    EditAccountPopup.push(_account)
  }

  function isLMSReferenceVisible_Ext(): Boolean {
    return _account.ProducerCode_Ext.ProducerServicingChannel_Ext.ServicingChannel ==
           ServicingChannelType_Ext.TC_DIRECT and
           ScriptParameters.isLMSReferenceNumber
  }
}