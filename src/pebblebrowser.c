#include <pebble.h>

static Window *window;
static TextLayer *text_layer;
char textbuf[256] = "";

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Loading...");
  DictionaryIterator *iterator = NULL;
  app_message_open(256, 256);
  if (app_message_outbox_begin(&iterator) == APP_MSG_OK && iterator != NULL) {
    const char *url = "http://news.sc5.io/";
    dict_write_cstring(iterator, 0, url);
    //uint32_t ds = dict_write_end(iterator);
    //APP_LOG(APP_LOG_LEVEL_DEBUG, "Wrote dict %lu bytes", ds);
    app_message_outbox_send();
  }
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  //text_layer_set_text(text_layer, "Foo");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  //text_layer_set_text(text_layer, "Bar");
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void received_callback(DictionaryIterator *iterator, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Received response!");
  Tuple *response = dict_find(iterator, 1); // response
  if (response && response->type == TUPLE_CSTRING) {
    strcpy(textbuf, response->value->cstring);
    text_layer_set_text(text_layer, textbuf);
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Response: %s", response->value->cstring);
  }
  response = dict_find(iterator, 2); // error
  if (response && response->type == TUPLE_CSTRING) {
    strcpy(textbuf, response->value->cstring);
    text_layer_set_text(text_layer, textbuf);
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Error: %s", response->value->cstring);
  }
  for (response = dict_read_first(iterator); response != NULL; response = dict_read_next(iterator)) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Dict: %d", response->type);
  }
}

static void dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Dropped response!");
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create((GRect) { .origin = { 0, 72 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer, "Web Browser");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));

  // AppMessage integration
  app_message_register_inbox_received(received_callback);
  app_message_register_inbox_dropped(dropped_callback);
}

static void window_unload(Window *window) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Deregistering callbacks!");
  app_message_deregister_callbacks();
  text_layer_destroy(text_layer);
}

static void init(void) {
  window = window_create();
  window_set_click_config_provider(window, click_config_provider);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);
}

static void deinit(void) {
  window_destroy(window);
}

int main(void) {
  init();

  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
