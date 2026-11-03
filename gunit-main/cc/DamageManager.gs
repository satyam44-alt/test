package gw.api.claim

uses gw.api.locale.DisplayKey

/**
 * Keeps track of a damage sub object on a claim, such as a PropertyFireDamage
 * or PropertyWaterDamage
 */
@Export
class DamageManager {

  var _claim : Claim as readonly Claim
  var _claimProperty : gw.lang.reflect.IPropertyInfo as readonly ClaimProperty
  var _icon : String as readonly Icon

  construct(inClaim : Claim, iconName : String, propertyName : String) {
    _claim = inClaim
    _claimProperty = entity.Claim.Type.TypeInfo.getProperty(propertyName)
    _icon = iconName
  }

  /** The name to use in the UI for this type of damage object */
  property get Name() : String {
    //noinspection DisplayKeyNotLiteral
    return DisplayKey.get("Web.Homeowners.LossDetails." + (ClaimProperty.Name))
  }

  /** Does the damage object exist? */
  property get Exists() : boolean {
    return _claimProperty.Accessor.getValue(_claim) != null
  }

  /** Set the existence of the damage object - creates or removes it as necessary */
  property set Exists(newValue: boolean) {
    if (Exists != newValue) {
      if (newValue) {
        var constructor = _claimProperty.FeatureType.TypeInfo.getConstructor({})
        _claimProperty.Accessor.setValue(_claim, constructor.Constructor.newInstance({}))
      } else {
        var bean = _claimProperty.Accessor.getValue(_claim) as KeyableBean
        bean.remove()
        _claimProperty.Accessor.setValue(_claim, null)
      }
    }
  }
}