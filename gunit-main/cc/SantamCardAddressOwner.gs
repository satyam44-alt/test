package za.co.santam.cc.contact.santamcard

uses entity.Address
uses gw.api.address.AddressOwnerFieldId
uses gw.api.address.CCAddressOwnerBase
uses gw.api.address.CCAddressOwnerUtil
uses gw.entity.IEntityPropertyInfo

class SantamCardAddressOwner extends CCAddressOwnerBase {

  private final var _aSantamCard : SantamCard_Ext

  /**
   * Create a new address owner.
   *
   * @param prop a non null property that has type Address
   */
  construct(aSantamCard : SantamCard_Ext) {
    super(getAddressProperty(entity.SantamCard_Ext, "DeliveryAddress"))
    _aSantamCard = aSantamCard
  }

  protected override property get Owner() : KeyableBean {
    return _aSantamCard
  }

  override property get Addresses() : Address[] {
    return {}
  }

  override property get Address() : Address {
    return _aSantamCard?.DeliveryAddress
  }

  override property set Address(address : Address) {
    if (_aSantamCard != null) {
      _aSantamCard.DeliveryAddress = address
    }
  }

  override function getOrCreateNewAddress() : Address {
    var prop = entity.SantamCard_Ext.Type.TypeInfo.getProperty("DeliveryAddress") as IEntityPropertyInfo
    return CCAddressOwnerUtil.getOrCreateNewBeanFor(_aSantamCard, prop, \-> {
      var result = new Address()
      result.Country = Country.TC_ZA
      result.AddressProvider = AddressProvider_Ext.TC_GOOGLE
      return result
    })
  }

  override property get NonEditableAddresses() : Set<Address> {
    return {}
  }

  override property get RequiredFields() : Set<AddressOwnerFieldId> {
    return {}
  }

  override property get HiddenFields() : Set<AddressOwnerFieldId> {
    return {AddressOwnerFieldId.VALIDUNTIL}
  }
}