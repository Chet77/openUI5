/*global QUnit*/

QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/dt/ElementOverlay",
	"sap/ui/dt/Overlay",
	"sap/ui/dt/OverlayRegistry",
	"sap/ui/dt/DOMUtil",
	"sap/ui/dt/ElementUtil",
	"sap/ui/dt/ElementDesignTimeMetadata",
	"sap/ui/dt/AggregationDesignTimeMetadata",
	"sap/ui/dt/DesignTime",
	"sap/m/Bar",
	"sap/m/VBox",
	"sap/m/Button",
	"sap/m/Page",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/TextArea",
	"sap/ui/layout/VerticalLayout",
	"sap/ui/layout/form/SimpleForm",
	"sap/ui/core/ElementMetadata",
	"sap/uxap/ObjectPageLayout",
	"sap/uxap/ObjectPageSection",
	"sap/uxap/ObjectPageSubSection",
	"sap/uxap/ObjectPageHeader",
	"dt/control/SimpleScrollControl",
	"sap/ui/thirdparty/sinon"
],
function(
	ElementOverlay,
	Overlay,
	OverlayRegistry,
	DOMUtil,
	ElementUtil,
	ElementDesignTimeMetadata,
	AggregationDesignTimeMetadata,
	DesignTime,
	Bar,
	VBox,
	Button,
	Page,
	Label,
	Text,
	TextArea,
	VerticalLayout,
	SimpleForm,
	ElementMetadata,
	ObjectPageLayout,
	ObjectPageSection,
	ObjectPageSubSection,
	ObjectPageHeader,
	SimpleScrollControl,
	sinon
) {
	"use strict";

	QUnit.start();

	var sandbox = sinon.sandbox.create();

	QUnit.module("Given that an Overlay Container is created", {
		beforeEach: function() {
			Overlay.getOverlayContainer();
		},
		afterEach: function() {
			Overlay.removeOverlayContainer();
		}
	}, function () {
		QUnit.test("then", function(assert) {
			var $container = jQuery("#overlay-container");
			assert.strictEqual($container.length, 1, "overlay container exists");
		});
	});


	QUnit.module("Given that an Overlay is created for a control", {
		beforeEach: function(assert) {
			var fnDone = assert.async();
			this.oButton = new Button({
				text: "Button"
			});
			this.oButton.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oElementOverlay = new ElementOverlay({
				isRoot: true,
				element: this.oButton,
				init: function (oEvent) {
					oEvent.getSource().placeInOverlayContainer();
					fnDone();
				}
			});
		},
		afterEach: function() {
			this.oElementOverlay.destroy();
			this.oButton.destroy();
			sandbox.restore();
		}
	}, function () {
		QUnit.test("when all is rendered", function(assert) {
			assert.ok(this.oElementOverlay.getDomRef(), "overlay is rendered");
			assert.ok(this.oElementOverlay.isVisible(), "overlay is visible");
			assert.deepEqual(this.oElementOverlay.$().offset(), this.oButton.$().offset(), "overlay has same position as a control");
		});

		QUnit.test("when overlay is enabled/disabled", function(assert) {
			var sWidth;
			var fnGetWidth = function (oOverlay) {
				return oOverlay.getDomRef().style.width;
			};

			// Overlay enabled by default
			sWidth = fnGetWidth(this.oElementOverlay);
			this.oButton.setText('Lorem ipsum dolor sit amet...');
			this.oElementOverlay.applyStyles();
			assert.notStrictEqual(sWidth, fnGetWidth(this.oElementOverlay), "overlay changes its width");

			sWidth = fnGetWidth(this.oElementOverlay);

			// Explicitly disable overlay
			this.oElementOverlay.setVisible(false);
			this.oButton.setText('Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi...');

			assert.strictEqual(sWidth, fnGetWidth(this.oElementOverlay), "overlay didn't change its width");
		});

		QUnit.test("When _onElementModified is called ", function(assert) {
			var oEventSpy = sandbox.spy(this.oElementOverlay, "fireElementModified");
			var oSetRelevantSpy = sandbox.spy(this.oElementOverlay, "setRelevantOverlays");

			var oEvent = {
				getParameters: function() {
					return {};
				}
			};
			this.oElementOverlay._onElementModified(oEvent);
			assert.equal(oEventSpy.callCount, 0, "without parameters, the modified event is not fired");
			assert.equal(oSetRelevantSpy.callCount, 0, "and setRelevantOverlays was not called");

			oEvent = {
				getParameters: function() {
					return {
						type: "propertyChanged",
						name: "visible"
					};
				}
			};
			this.oElementOverlay._onElementModified(oEvent);
			assert.equal(oEventSpy.callCount, 1, "with propertyChanged and visible as parameters,the modified event is fired");
			assert.equal(oSetRelevantSpy.callCount, 1, "and setRelevantOverlays was called");

			oEvent = {
				getParameters: function() {
					return {
						type: "propertyChanged",
						name: "text"
					};
				}
			};
			this.oElementOverlay._onElementModified(oEvent);
			assert.equal(oEventSpy.callCount, 1, "with propertyChanged and text as parameters, the modified event is not fired");
			assert.equal(oSetRelevantSpy.callCount, 1, "and setRelevantOverlays was not called");

			sandbox.stub(this.oElementOverlay, "getAggregationOverlay").returns(this.oElementOverlay);
			oEvent = {
				getParameters: function() {
					return {
						type: "insertAggregation",
						name: "aggregationName"
					};
				}
			};
			this.oElementOverlay._onElementModified(oEvent);
			assert.equal(oEventSpy.callCount, 2, "with insertAggregation and a name, the modified event is fired");
			assert.equal(oSetRelevantSpy.callCount, 2, "and setRelevantOverlays was called");

			oEvent = {
				getParameters: function() {
					return {
						type: "setParent"
					};
				}
			};
			this.oElementOverlay._onElementModified(oEvent);
			assert.equal(oEventSpy.callCount, 3, "with setParent as type, the modified event is fired");
			assert.equal(oSetRelevantSpy.callCount, 2, "and setRelevantOverlays was not called");
		});

		QUnit.test("when the control is rendered", function(assert) {
			var $DomRef = this.oElementOverlay.$();

			assert.ok($DomRef.hasClass("sapUiDtOverlay"), 'and the right CSS class overlay is set to the element');
			assert.ok($DomRef.hasClass("sapUiDtElementOverlay"), 'and the right CSS element overlay class is set to the element');

			var mElementOffset = this.oElementOverlay.getElement().$().offset();
			var mOverlayOffset = $DomRef.offset();
			assert.equal(mOverlayOffset.top, mElementOffset.top, 'and the right postion "top" is applied to the overlay');
			assert.equal(mOverlayOffset.left, mElementOffset.left, 'and the right postion "left" is applied to the overlay');

			var oDesignTimeMetadata = this.oElementOverlay.getDesignTimeMetadata();
			assert.ok(oDesignTimeMetadata instanceof ElementDesignTimeMetadata, "and the design time metadata for the control is set");
		});

		QUnit.test("when CSS animation takes place in UI", function(assert) {
			var done = assert.async();

			var fnCheckSize = function() {
				assert.strictEqual(this.oButton.$().width(), this.oElementOverlay.$().width());
				done();
			}.bind(this);

			// TODO: check browser support once again
			if (!sap.ui.Device.browser.phantomJS && !sap.ui.Device.browser.edge && !sap.ui.Device.browser.msie) {
				this.oButton.$().on("animationend webkitAnimationEnd oanimationend", fnCheckSize);
			} else {
				// phantomjs, MSIE & MS Edge don't support animation end events
				setTimeout(fnCheckSize, 110);
			}

			this.oButton.addStyleClass("sapUiDtTestAnimate");
		});

		QUnit.test("when the overlay is rerendered", function(assert) {
			assert.ok(this.oElementOverlay.isRendered(), 'ElementOverlay is initially rendered');

			var oDomRef = this.oElementOverlay.getDomRef();

			assert.strictEqual(oDomRef, this.oElementOverlay.render(), 'then DOM Nodes are the same after second render()');
		});

		QUnit.test("when setSelectable, setMovable, setEditable is called on the overlay with undefined", function(assert) {
			this.oElementOverlay.setSelectable(undefined);
			assert.equal(this.oElementOverlay.isSelectable(), false, 'then the overlay is not selectable');
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlaySelectable"), false, "the Overlay doesn't have the sapUiDtOverlaySelectable StyleClass");
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlayFocusable"), false, "the Overlay doesn't have the sapUiDtOverlayFocusable StyleClass");

			this.oElementOverlay.setMovable(undefined);
			assert.equal(this.oElementOverlay.isMovable(), false, 'then the overlay is not movable');
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlayMovable"), false, "the Overlay doesn't have the sapUiDtOverlayMovable StyleClass");
			this.oElementOverlay.setMovable(true);
			assert.equal(this.oElementOverlay.isMovable(), true, 'then the overlay is movable');
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlayMovable"), true, "the Overlay has the sapUiDtOverlayMovable StyleClass");

			this.oElementOverlay.setEditable(undefined);
			assert.equal(this.oElementOverlay.isEditable(), false, 'then the overlay is not editable');
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlayEditable"), false, "the Overlay doesn't have the sapUiDtOverlayEditable StyleClass");
			this.oElementOverlay.setEditable(true);
			assert.equal(this.oElementOverlay.isEditable(), true, 'then the overlay is editable');
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlayEditable"), true, "the Overlay has the sapUiDtOverlayEditable StyleClass");
		});

		QUnit.test("when setSelected is called on the overlay with undefined", function(assert) {
			this.oElementOverlay.setSelectable(true);
			this.oElementOverlay.setSelected(undefined);
			assert.equal(this.oElementOverlay.isSelectable(), true, 'then the overlay is selectable');
			assert.equal(this.oElementOverlay.isSelected(), false, 'then the overlay is not selected');
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlaySelectable"), true, "the Overlay doesn't have the Selectable StyleClass");
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlayFocusable"), true, "the Overlay doesn't have the focusable StyleClass");
			assert.strictEqual(this.oElementOverlay.hasStyleClass("sapUiDtOverlaySelected"), false, "the Overlay doesn't have the selected StyleClass");
		});


		QUnit.test("when the overlay is selectable and selected", function(assert) {
			this.oElementOverlay.attachSelectionChange(function(oEvent) {
				assert.ok(oEvent.getParameter("selected"), 'and a "selectionChange" event is fired which provides the right selected state');
			}, this);
			this.oElementOverlay.setSelectable(true);
			this.oElementOverlay.setSelected(true);
			assert.ok(this.oElementOverlay.isSelected(), 'then the state of the overlay is "selected"');
		});

		QUnit.test("when the overlay is selected and selected again", function(assert) {
			this.oElementOverlay.setSelected(true);
			var bFired = false;
			this.oElementOverlay.attachSelectionChange(function(oEvent) {
				bFired = true;
			}, this);
			this.oElementOverlay.setSelected(true);
			assert.ok(!bFired, 'then the "selection change" event should not fire again');
		});


		QUnit.test("when the overlay is changed to selectable false and the overlay is selected", function(assert) {
			this.oElementOverlay.setSelectable(false);
			assert.ok(!this.oElementOverlay.isSelectable(), 'then the state of the overlay is "not selectable"');

			var bFired = false;
			this.oElementOverlay.attachSelectionChange(function(oEvent) {
				bFired = true;
			}, this);
			this.oElementOverlay.setSelected(true);
			assert.ok(!this.oElementOverlay.isSelected(), 'and the state of the overlay is "not selected"');
			assert.ok(!bFired, 'and no "selection change" event is fired');
		});

		QUnit.test("when the overlay is selectable or not selectable", function(assert) {
			this.oElementOverlay.setSelectable(true);
			assert.ok(this.oElementOverlay.isFocusable(), "then the control is focusable");

			this.oElementOverlay.setSelectable(false);
			assert.ok(!this.oElementOverlay.isFocusable(), "then the control is not focusable");
		});

		QUnit.test("when the overlay is focusable and is focused", function(assert) {
			this.oElementOverlay.setFocusable(true);
			assert.ok(this.oElementOverlay.isFocusable(), "then the control knows it is focusable");
			this.oElementOverlay.focus();
			assert.ok(this.oElementOverlay.hasFocus(), 'then the state of the overlay is "focused"');
		});

		QUnit.test("when ignore for the aggregation is not defined, then...", function(assert) {
			this.oElementOverlay.setDesignTimeMetadata(new ElementDesignTimeMetadata({
				data: {
					aggregations: {
						testAggregation1: {
							ignore: true
						},
						testAggregation2: {}
					}
				}
			}));

			assert.ok(this.oElementOverlay.getAggregationNames().indexOf('testAggregation1') === -1, 'then aggregation is ignored properly');
			assert.ok(this.oElementOverlay.getAggregationNames().indexOf('testAggregation2') !== -1, 'then aggregation is not ignored');
		});
	});

	QUnit.module("Given that an Overlay is created for a control with an invisible domRef", {
		beforeEach : function(assert) {
			var done = assert.async();
			this.oLabel = new Label();
			this.oLabel.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();
			this.oDesignTime = new DesignTime({
				rootElements : [this.oLabel]
			});
			this.oDesignTime.attachEventOnce("synced", function() {
				this.oOverlay = OverlayRegistry.getOverlay(this.oLabel);
				done();
			}.bind(this));
		},
		afterEach : function() {
			this.oDesignTime.destroy();
			this.oLabel.destroy();
		}
	}, function () {
		QUnit.test("when the control's domRef is changed to visible...", function(assert) {
			this.oLabel.setText("test");
			this.oOverlay.applyStyles();
			assert.ok(this.oOverlay.$().is(":visible"), "the overlay is also visible in DOM");
		});
	});

	QUnit.module("Given that an Overlay is created for a layout with an invisible domRef", {
		beforeEach: function(assert) {
			var done = assert.async();
			this.oLabel = new Label({text : "text"});
			this.oVerticalLayout = new VerticalLayout({ content : [this.oLabel] });
			this.oVerticalLayout.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();
			this.oVerticalLayout.$().css("display", "none");

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVerticalLayout]
			});
			this.oDesignTime.attachEventOnce("synced", function() {
				this.oLabelOverlay = OverlayRegistry.getOverlay(this.oLabel);
				this.oLayoutOverlay = OverlayRegistry.getOverlay(this.oVerticalLayout);
				done();
			}.bind(this));
		},
		afterEach: function() {
			this.oDesignTime.destroy();
			this.oVerticalLayout.destroy();
		}
	}, function () {
		// TODO: BUG - Invisible layout still has a rendered overlay
		QUnit.test("when the layout's domRef is changed to visible...", function(assert) {
			assert.notOk(this.oLayoutOverlay.$().is(':visible'), "the layout's overlay should not be in the DOM when the layout is invisible");
			this.oVerticalLayout.$().css("display", "block");
			this.oLayoutOverlay.applyStyles();
			sap.ui.getCore().applyChanges();

			assert.ok(this.oLayoutOverlay.$().is(':visible'), "the layout's overlay is also in DOM");
			assert.ok(this.oLabelOverlay.$().is(':visible'), "layout children's overlay is also in DOM");
		});
	});

	QUnit.module("Given that an Overlay is created for a layout with a visible domRef", {
		beforeEach : function(assert) {
			var done = assert.async();
			this.oLabel1 = new Label({text : "text 1"});
			this.oLabel2 = new Label({text : "text 2"});
			this.oInnerLayout = new VerticalLayout({ content : [this.oLabel2] });
			this.oVerticalLayout = new VerticalLayout({ content : [this.oLabel1, this.oInnerLayout] });
			this.oVerticalLayout.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oDesignTime = new DesignTime({
				rootElements : [this.oVerticalLayout]
			});
			this.oDesignTime.attachEventOnce("synced", function() {
				this.oLabelOverlay1 = OverlayRegistry.getOverlay(this.oLabel1);
				this.oLayoutOverlay = OverlayRegistry.getOverlay(this.oVerticalLayout);
				done();
			}.bind(this));
		},
		afterEach : function() {
			this.oVerticalLayout.destroy();
			this.oDesignTime.destroy();
		}
	}, function () {
		QUnit.test("when the layout is switched to invisible and the back to visible...", function(assert) {
			var done = assert.async();

			this.oVerticalLayout.setVisible(false);
			sap.ui.getCore().applyChanges();
			this.oVerticalLayout.setVisible(true);
			sap.ui.getCore().applyChanges();

			// timeout is needed to handle applyStyles
			setTimeout(function() {
			// Math.ceil is needed for IE11
				assert.deepEqual(Math.ceil(this.oLayoutOverlay.$().offset().top), Math.ceil(this.oVerticalLayout.$().offset().top), "top position of the Layout overlay is correct");
				assert.deepEqual(Math.ceil(this.oLayoutOverlay.$().offset().left), Math.ceil(this.oVerticalLayout.$().offset().left), "left position of the Layout overlay is correct");
				assert.deepEqual(Math.ceil(this.oLabelOverlay1.$().offset().top), Math.ceil(this.oLabel1.$().offset().top), "top position of the Label overlay is correct");
				assert.deepEqual(Math.ceil(this.oLabelOverlay1.$().offset().left), Math.ceil(this.oLabel1.$().offset().left), "left position of the Label overlay is correct");

				done();
			}.bind(this), 0);
		});
	});

	QUnit.module("Given that an Overlay is created for a layout with child controls", {
		beforeEach : function(assert) {
			var done = assert.async();
			this.oButton1 = new Button({
				text : "Button 1"
			});
			this.oVerticalLayout1 = new VerticalLayout({
				content : [this.oButton1]
			});
			this.oVerticalLayout2 = new VerticalLayout();
			this.oVerticalLayout = new VerticalLayout({
				content: [this.oVerticalLayout1, this.oVerticalLayout2]
			});
			this.oVerticalLayout.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oDesignTime = new DesignTime({
				rootElements : [this.oVerticalLayout]
			});
			this.oDesignTime.attachEventOnce("synced", function() {
				this.oOverlayButton1 = OverlayRegistry.getOverlay(this.oButton1);
				this.oOverlayLayout1 = OverlayRegistry.getOverlay(this.oVerticalLayout1);
				this.oOverlayLayout2 = OverlayRegistry.getOverlay(this.oVerticalLayout2);
				done();
			}.bind(this));

		},
		afterEach : function() {
			this.oButton1.destroy();
			this.oVerticalLayout.destroy();
			this.oDesignTime.destroy();
		}
	}, function () {
		QUnit.test("when the layout is rendered", function(assert) {
			assert.ok(this.oOverlayButton1.getParent().getParent() === this.oOverlayLayout1, "then a button's overlay should be inside of the layout's overlay");
		});

		QUnit.test("when a control is moved from one layout to another", function(assert) {
			this.oVerticalLayout2.addContent(this.oButton1);
			sap.ui.getCore().applyChanges();
			// first parent is aggregation overlay, second parent is overlay control
			assert.ok(this.oOverlayButton1.getParent().getParent() === this.oOverlayLayout2, "then the button's overlay should be inside the other layout's overlay");
		});
	});

	QUnit.module("Given that an Overlay is created for a control with custom design time metadata", {
		beforeEach : function() {
			this.oButton = new Button({
				text: "Button"
			});
			this.oOverlay = new ElementOverlay({
				element : this.oButton,
				designTimeMetadata : new ElementDesignTimeMetadata({
					data : {
						name : "My Custom Metadata"
					}
				})
			});
			this.oOverlay.placeInOverlayContainer();
			this.oButton.placeAt("qunit-fixture");
			// Render Controls
			sap.ui.getCore().applyChanges();
		},
		afterEach : function() {
			this.oOverlay.destroy();
			this.oButton.destroy();
		}
	}, function () {
		QUnit.test("when the design time metadata is retrieved", function(assert) {
			var oDesignTimeMetadata = this.oOverlay.getDesignTimeMetadata();
			assert.equal(oDesignTimeMetadata.getData().name, "My Custom Metadata", "then the right custom data is set");
		});
	});

	QUnit.module("Given that an Overlay is created for a control marked as ignored in the designtime Metadata", {
		beforeEach : function(assert) {
			var fnDone = assert.async();
			this.oButton = new Button({
				text: "Button"
			});
			this.oButton.placeAt("qunit-fixture");

			this.oOverlay = new ElementOverlay({
				isRoot: true,
				element : this.oButton,
				designTimeMetadata : new ElementDesignTimeMetadata({
					data : {
						ignore : true
					}
				}),
				init: function(){
					this.oOverlay.placeInOverlayContainer();
					sap.ui.getCore().applyChanges();
					fnDone();
				}.bind(this)
			});
		},
		afterEach : function() {
			this.oOverlay.destroy();
			this.oButton.destroy();
		}
	}, function () {
		QUnit.test("then...", function(assert) {
			assert.strictEqual(this.oOverlay.isVisible(), false, "the overlay is marked as invisible");
			assert.strictEqual(this.oOverlay.$().is(":visible"), false, "the overlay is hidden in DOM");
		});
	});

	QUnit.module("Given that an Overlay is created for a control with cloneDomRef:true in the designtime Metadata", {
		beforeEach : function(assert) {
			var fnDone = assert.async();

			this.oButton = new Button({
				text : "Button"
			});
			this.oButton.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oOverlay = new ElementOverlay({
				isRoot: true,
				element : this.oButton,
				designTimeMetadata : new ElementDesignTimeMetadata({
					data: {
						cloneDomRef : true
					}
				}),
				init: function(){
					this.placeInOverlayContainer();
					fnDone();
				}
			});
		},
		afterEach : function() {
			this.oOverlay.destroy();
			this.oButton.destroy();
		}
	}, function () {
		QUnit.test("when the overlay is rendered", function(assert) {
			assert.strictEqual(this.oOverlay.$().find(".sapUiDtClonedDom").length, 1, "then a cloned DOM node is found in the overlay");
		});
	});

	QUnit.module("Given that an Overlay is created for a control with cloneDomRef:'css-selector' in the designtime Metadata", {
		beforeEach : function(assert) {
			var fnDone = assert.async();

			this.oButton = new Button({
				text : "Button"
			}).placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();
			this.oOverlay = new ElementOverlay({
				isRoot: true,
				element: this.oButton,
				designTimeMetadata: new ElementDesignTimeMetadata({
					data: {
						cloneDomRef: ":sap-domref"
					}
				}),
				init: function(){
					this.placeInOverlayContainer();
					fnDone();
				}
			});
		},
		afterEach : function() {
			this.oOverlay.destroy();
			this.oButton.destroy();
		}
	}, function () {
		QUnit.test("when the overlay is rendered", function(assert) {
			assert.strictEqual(this.oOverlay.$().find(".sapUiDtClonedDom").length, 1, "then a cloned DOM node is found in the overlay");
		});
	});

	QUnit.module("Given that an Overlay is created for two layouts with two child controls", {
		beforeEach: function(assert) {
			var fnDone = assert.async();
			this.oButton1 = new Button({
				text : "Button 1"
			});
			this.oButton2 = new Button({
				text : "Button 2"
			});
			this.oButton3 = new Button({
				text : "Button 3"
			});
			this.oButton4 = new Button({
				text : "Button 4"
			});

			this.oVerticalLayout1 = new VerticalLayout({
					content : [this.oButton1, this.oButton2]
			});

			this.oVerticalLayout2 = new VerticalLayout({
				content : [this.oButton3, this.oButton4]
			});

			this.oVerticalLayout1.placeAt("qunit-fixture");
			this.oVerticalLayout2.placeAt("qunit-fixture");

			sap.ui.getCore().applyChanges();

			this.oDesignTime = new DesignTime({
				rootElements: [
					this.oVerticalLayout1,
					this.oVerticalLayout2
				]
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				this.oOverlayLayout1 = OverlayRegistry.getOverlay(this.oVerticalLayout1);
				this.oOverlayLayout2 = OverlayRegistry.getOverlay(this.oVerticalLayout2);
				this.oOverlayButton1 = OverlayRegistry.getOverlay(this.oButton1);
				this.oOverlayButton2 = OverlayRegistry.getOverlay(this.oButton2);
				this.oOverlayButton3 = OverlayRegistry.getOverlay(this.oButton3);
				this.oOverlayButton4 = OverlayRegistry.getOverlay(this.oButton4);
				fnDone();
			}, this);
		},
		afterEach : function() {
			this.oVerticalLayout2.destroy();
			this.oVerticalLayout1.destroy();
			this.oDesignTime.destroy();
		}
	}, function () {
		QUnit.test("when a control is moved to another layout", function(assert) {
			ElementUtil.insertAggregation(this.oVerticalLayout2, "content", this.oButton2, 1);

			var oDomRefButton1 = this.oOverlayButton1.getDomRef();
			var oDomRefButton2 = this.oOverlayButton2.getDomRef();
			var oDomRefButton3 = this.oOverlayButton3.getDomRef();
			var oDomRefButton4 = this.oOverlayButton4.getDomRef();

			assert.strictEqual(oDomRefButton3, oDomRefButton2.previousElementSibling, "then Overlay DOM elements in target layout are in correct order - button3 before button2");
			assert.strictEqual(oDomRefButton4, oDomRefButton2.nextElementSibling, "then Overlay DOM elements in target layout are in correct order - button4 after button2");
			assert.strictEqual(null, oDomRefButton1.nextElementSibling, "and source layout contains only one control");
		});
		QUnit.test("when DomRef of Overlay Layout contains extra elements and the control is prepended to this layout", function(assert) {
			this.oOverlayLayout2.$().prepend("<div></div>");
			ElementUtil.insertAggregation(this.oVerticalLayout2, "content", this.oButton2, 0);

			var oDomRefButton2 = this.oOverlayButton2.getDomRef();
			var oDomRefButton3 = this.oOverlayButton3.getDomRef();

			assert.strictEqual(oDomRefButton3, oDomRefButton2.nextElementSibling, "then Overlay DOM elements in target layout are in correct order");
			assert.strictEqual(null, oDomRefButton2.previousElementSibling, "and extra element is not taken into account");
		});
	});

	QUnit.module("Given that an Overlay is created for a control in the content of a scrollable container", {
		beforeEach: function(assert) {
			var fnDone = assert.async();
			this.$container = jQuery("<div id='scroll-container' style='height: 400px; width: 200px; overflow-y: auto;'><div style='width: 100%; height: 100px;'></div><div id='scroll-content' style='height: 500px;'></div></div>");
			this.$container.appendTo("#qunit-fixture");

			this.oButton = new Button({
				text: "Button"
			});
			this.oButton.placeAt("scroll-content");
			sap.ui.getCore().applyChanges();

			this.oOverlay = new ElementOverlay({
				isRoot: true,
				element: this.oButton,
				init: function () {
					this.placeInOverlayContainer();
					fnDone();
				}
			});
		},
		afterEach: function() {
			this.oOverlay.destroy();
			this.$container.remove();
			this.oButton.destroy();
		}
	}, function () {
		QUnit.test("when the container is scrolled", function(assert) {
			var fnDone = assert.async();
			this.oOverlay.attachEventOnce('geometryChanged', function () {
				assert.deepEqual(this.oOverlay.$().offset(), this.oButton.$().offset(), "overlay has same position as a control");
				fnDone();
			}, this);
			this.$container.scrollTop(50);
		});
	});

	QUnit.module("Given a SimpleScrollControl with Overlays", {
		beforeEach : function(assert) {
			var done = assert.async();

			this.oSimpleScrollControl = new SimpleScrollControl("scrollControl");
			this.oSimpleScrollControl.addContent1(new TextArea({
				height: "500px",
				width: "400px",
				value: "foo"
			}));
			this.oSimpleScrollControl.addContent2(new TextArea({
				height: "500px",
				width: "400px",
				value: "bar"
			}));
			this.oVBox = new sap.m.VBox({
				items : [this.oSimpleScrollControl]
			}).placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oDesignTime = new sap.ui.dt.DesignTime({
				rootElements : [this.oVBox]
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				this.oSimpleScrollControlOverlay = OverlayRegistry.getOverlay(this.oSimpleScrollControl);
				sap.ui.getCore().applyChanges();
				done();
			}.bind(this));
		},
		afterEach : function() {
			sandbox.restore();
			this.oVBox.destroy();
			this.oDesignTime.destroy();
		}
	}, function () {
		QUnit.test("when the control is scrolled", function(assert) {
			var done = assert.async();
			var oContent1 = this.oSimpleScrollControl.getContent1()[0];
			var oContent1Overlay = sap.ui.dt.OverlayRegistry.getOverlay(oContent1);
			var sInitialOffsetTop = oContent1.$().offset().top;
			var oInitialControlOffset = oContent1.$().offset();
			var oInitialOverlayOffset = oContent1Overlay.$().offset();

			// var oApplyStylesSpy = sandbox.spy(Overlay.prototype, "applyStyles");

			this.oSimpleScrollControlOverlay.getScrollContainerByIndex(0).scroll(function() {
				// assert.equal(oApplyStylesSpy.callCount, 0,  "then the applyStyles Method is not called"); // due workaround for scroll event it's not true ATM
				assert.equal(oContent1.$().offset().top, sInitialOffsetTop - 100, "Then the top offset is 100px lower");
				assert.deepEqual(oContent1.$().offset(), oContent1Overlay.$().offset(), "Then the offset is still equal");
				assert.deepEqual(oInitialControlOffset, oInitialOverlayOffset, "Then the offset is still equal");
				done();
			});
			this.oSimpleScrollControl.$().find("> .sapUiDtTestSSCScrollContainer").scrollTop(100);
		});

		QUnit.test("when the overlay is scrolled", function(assert) {
			var done = assert.async();
			var oContent1 = this.oSimpleScrollControl.getContent1()[0];
			var oContent1Overlay = sap.ui.dt.OverlayRegistry.getOverlay(oContent1);
			var sInitialOffsetTop = oContent1.$().offset().top;
			var oInitialControlOffset = oContent1.$().offset();
			var oInitialOverlayOffset = oContent1Overlay.$().offset();

			// var oApplyStylesSpy = sandbox.spy(Overlay.prototype, "applyStyles");

			this.oSimpleScrollControl.$().find("> .sapUiDtTestSSCScrollContainer").scroll(function() {
				// assert.equal(oApplyStylesSpy.callCount, 0,  "then the applyStyles Method is not called"); // see above
				assert.equal(oContent1.$().offset().top, sInitialOffsetTop - 100, "Then the top offset is 100px lower");
				assert.deepEqual(oContent1.$().offset(), oContent1Overlay.$().offset(), "Then the offset is still equal");
				assert.deepEqual(oInitialControlOffset, oInitialOverlayOffset, "Then the offset is still equal");
				done();
			});
			this.oSimpleScrollControlOverlay.getScrollContainerByIndex(0).scrollTop(100);
		});
	});

	QUnit.module("Given that a DesignTime is created for a control", {
		beforeEach : function(assert) {
			var fnDone = assert.async();
			var fnDone2 = assert.async();

			var oSubSection = new ObjectPageSubSection("subsection", {
				blocks: [new Button({text: "abc"}), new Button({text: "def"}), new Button({text: "ghi"})]
			});
			var oSubSection2 = new ObjectPageSubSection("subsection2", {
				blocks: [new Button({text: "foo"}), new Button({text: "bar"}), new Button({text: "foobar"})]
			});
			var oSection = new ObjectPageSection("section", {
				subSections: [oSubSection]
			});
			var oSection2 = new ObjectPageSection("section2", {
				subSections: [oSubSection2]
			});
			this.oLayout = new ObjectPageLayout("layout", {
				height: "300px",
				sections : [oSection, oSection2],
				headerTitle: new ObjectPageHeader({
					objectTitle: "Title"
				}),
				headerContent: new Button({
					text: "headerContent"
				}),
				footer: new Bar({
					contentMiddle: [new Button({text: "footer"})]
				}),
				showFooter: true
			}).attachEventOnce('onAfterRenderingDOMReady', fnDone2);
			this.oVBox = new VBox({
				items : [this.oLayout]
			}).placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVBox]
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				this.oLayoutOverlay = OverlayRegistry.getOverlay(this.oLayout);
				fnDone();
			}.bind(this));
		},
		afterEach : function() {
			this.oDesignTime.destroy();
			this.oVBox.destroy();
		}
	}, function () {
		// QUnit.test("when the control is rendered", function(assert) {
		// 	var oHeaderTitleOverlay = this.oLayoutOverlay.getAggregationOverlay("headerTitle");
		// 	var oHeaderContentOverlay = this.oLayoutOverlay.getAggregationOverlay("headerContent");
		// 	var oSectionsOverlay = this.oLayoutOverlay.getAggregationOverlay("sections");
		// 	var oFooterOverlay = this.oLayoutOverlay.getAggregationOverlay("footer");
		//
		// 	var aAggregationOverlays = this.oLayoutOverlay.getChildren();
		// 	var iIndexHeaderTitleOverlay = aAggregationOverlays.indexOf(oHeaderTitleOverlay);
		// 	var iIndexHeaderContentOverlay = aAggregationOverlays.indexOf(oHeaderContentOverlay);
		// 	var iIndexSectionsOverlay = aAggregationOverlays.indexOf(oSectionsOverlay);
		// 	var iIndexFooterOverlay = aAggregationOverlays.indexOf(oFooterOverlay);
		//
		// 	assert.ok(iIndexHeaderTitleOverlay < iIndexHeaderContentOverlay, "then the overlay for headerTitle is above headerContent");
		// 	assert.ok(iIndexHeaderContentOverlay < iIndexSectionsOverlay, "then the overlay for headerContent is above sections");
		// 	assert.ok(iIndexSectionsOverlay < iIndexFooterOverlay, "then the overlay for sections is above footer");
		//
		// 	var $AggregationOverlays = jQuery(this.oLayoutOverlay.$().children()[1]).children();
		// 	assert.equal($AggregationOverlays.get(1).className, "sapUiDtOverlayScrollContainer", "then a scrollContainer is second in DOM");
		// 	var $scrollContainerChildren = jQuery($AggregationOverlays.get(1)).children();
		// 	assert.equal($AggregationOverlays.get(2).className, "sapUiDtOverlayScrollContainer", "then a scrollContainer is third in DOM");
		//
		// 	assert.equal($AggregationOverlays.get(0).dataset["sapUiDtAggregation"], "headerTitle", "then the overlay for headerTitle is first in DOM");
		// 	assert.equal($scrollContainerChildren.get(0).dataset["sapUiDtAggregation"], "headerContent", "then the overlay for headerContent is first in the first ScrollContainer in DOM");
		// 	assert.equal($scrollContainerChildren.get(1).dataset["sapUiDtAggregation"], "sections", "then the overlay for headerContent is second in the first ScrollContainer in DOM");
		// 	assert.equal($AggregationOverlays.get(3).dataset["sapUiDtAggregation"], "footer", "then the overlay for headerTitle is fourth in DOM");
		// });

		QUnit.test("when _cloneDomRef is called", function(assert) {
			this.oLayoutOverlay._cloneDomRef(this.oLayout.$().find("header")[0]);

			var oSrcDomElement = this.oLayout.$().find("header").get(0);
			var oDestDomElement = this.oLayoutOverlay.$().find(">.sapUiDtClonedDom").get(0);

			assert.equal(window.getComputedStyle(oSrcDomElement)["visibility"], "hidden", "then the original domRef is hidden");
			assert.equal(window.getComputedStyle(oDestDomElement)["visibility"], "visible", "then the cloned domRef is visible");

			this.oLayoutOverlay._restoreVisibility();
			assert.equal(
				window.getComputedStyle(oSrcDomElement)["visibility"],
				"visible",
				"then after restoring visibility the original domRef is visible again"
			);
		});
	});

	QUnit.module("Given another SimpleScrollControl with Overlays and one scroll container aggregation is ignored", {
		beforeEach : function(assert) {
			var ScrollControl = SimpleScrollControl.extend('sap.ui.dt.test.controls.ScrollControl', {
				metadata: {
					designtime: {
						aggregations: {
							content1: {
								ignore: true
							}
						}
					}
				},
				renderer: SimpleScrollControl.getMetadata().getRenderer().render
			});

			var fnDone = assert.async();

			this.oScrollControl = new ScrollControl({
				id: "scrollControl",
				content1: [
					new TextArea({ value: "foo" })
				],
				content2: [
					new TextArea({ value: "bar" })
				],
				footer: [
					new TextArea({ value: "footer" })
				]
			});

			this.oVBox = new VBox({
				items: [this.oScrollControl]
			}).placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVBox]
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				this.oScrollControlOverlay = OverlayRegistry.getOverlay(this.oScrollControl);
				fnDone();
			}.bind(this));
		},
		afterEach: function() {
			this.oVBox.destroy();
			this.oDesignTime.destroy();
		}
	}, function () {
		QUnit.test("when the overlay is rendered, also aggregation overlays are rendered", function(assert) {
			assert.ok(this.oScrollControlOverlay.getDomRef(), "overlay has domRef");
			assert.ok(this.oScrollControlOverlay.getAggregationOverlay("content2").getDomRef(), "aggregation overlay in scroll container has domRef");
			assert.ok(this.oScrollControlOverlay.getAggregationOverlay("footer").getDomRef(), "aggregation overlay outside scroll container has domRef");
		});
	});

	QUnit.done(function( details ) {
		jQuery("#qunit-fixture").hide();
	});

});