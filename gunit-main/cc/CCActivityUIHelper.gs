package za.co.santam.cc.activity



class ActivityUIHelper {

  // Returns all open activities, filtering out selected santam activities
  function getActivities_Ext(claim : Claim) : IQueryBeanResult<Activity> {
    var activityList = gw.api.claim.ClaimUtil.getActivities(claim)

    if (currentUserIsNotANonMotorQAMember()) {
      activityList.addPersistentFilter(filterOutAuditActivities())
      return activityList
    }

    return activityList
  }

  private function currentUserIsNotANonMotorQAMember() : boolean {
    return not User.util.CurrentUser.GroupUsers.hasMatch(
      \elt1 -> elt1.Group.Name == SantamConstants.GROUPNAME_NON_MOTOR_QA
    )
  }

  // All activities
  function getAllActivities_Ext(claim : Claim) : IQueryBeanResult<Activity> {
    var allActivities = Query.make(entity.Activity)
      .compare("claim", Equals, claim)
      .select()

    if (currentUserIsNotANonMotorQAMember()) {
      allActivities.addPersistentFilter(filterOutAuditActivities())
    }

    return allActivities
  }

  // Filter out all audit activities
  function filterOutAuditActivities() : StandardQueryFilter {
    var internalAuditActivityCodes = SantamConstants.STP_AUDIT_ACTIVITIES

    return new StandardQueryFilter(
      "filterToInternalAuditActivityCodes",
      \q -> q.join(Activity#ActivityPattern)
             .compareNotIn(ActivityPattern#Code, internalAuditActivityCodes)
    )
  }
}