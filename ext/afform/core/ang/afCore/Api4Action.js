(function(angular, $, _) {

  angular.module('afCore').directive('afApi4Action', function($parse, crmStatus, crmApi4) {
    return {
      restrict: 'A',
      scope: {
        afApi4Action: '@',
        afApi4StartMsg: '=',
        afApi4ErrorMsg: '=',
        afApi4SuccessMsg: '=',
        afApi4Success: '@',
        onError: '@'
      },
      link: function($scope, $el, $attr) {
        const ts = CRM.ts(null);

        // Toggle the running/idle CSS classes for busy-state feedback while the call is in flight
        function running(x) {$el.toggleClass('af-api4-action-running', x).toggleClass('af-api4-action-idle', !x);}

        running(false);

        $el.click(function(){
          // The af-api4-action expression lives on the host form's scope: $parse + eval it on $parent to get [entity, action, params]
          const parts = $parse($scope.afApi4Action)($scope.$parent);
          const msgs = {
            start: $scope.afApi4StartMsg || ts('Submitting...'),
            success: $scope.afApi4SuccessMsg,
            error: $scope.afApi4ErrorMsg
          };
          running(true);
          // Fire crmApi4(entity, action, params); crmStatus wraps it to show start/success/error status messages
          crmStatus(msgs, crmApi4(parts[0], parts[1], parts[2]))
            .finally(function(){running(false);})
            // $eval the optional af-api4-success / on-error expressions back on $parent, exposing response/error as locals
            .then(function(response){$scope.$parent.$eval($scope.afApi4Success, {response: response});})
            .catch(function(error){$scope.$parent.$eval($scope.onError, {error: error});});
        });
      }
    };
  });

})(angular, CRM.$, CRM._);
