/*!
 * ${copyright}
 */
sap.ui.define(["./StandardListItemRenderer", "sap/ui/core/Renderer"],
	function (StandardListItemRenderer, Renderer) {
		"use strict";


		/**
		 * MessageListItem renderer.
		 * @namespace
		 */
		var MessageListItemRenderer = Renderer.extend(StandardListItemRenderer);

		MessageListItemRenderer.renderTitle = function (oRm, oControl) {
			if (oControl.getActiveTitle()) {
				oRm.renderControl(oControl.getLink());
			} else {
				StandardListItemRenderer.renderTitle.apply(this, arguments);
			}
		};

		return MessageListItemRenderer;

	}, /* bExport= */ true);
