#include <pebble.h>

static Window *window;
static TextLayer *text_layer;
static TextLayer *text_layer2;
static TextLayer *text_layer3;
static char titlebuf[256] = "";
static char textbuf[256] = "";
static char textbuf2[256] = "";
static char textbuf3[256] = "";
static int blockcount = 0;
static int textcount = 0;
static int tablecount = 0;
static int linkcount = 0;

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Loading...");
  DictionaryIterator *iterator = NULL;
  if (app_message_outbox_begin(&iterator) == APP_MSG_OK && iterator != NULL) {
    //const char *url = "http://example.org/";
    //const char *url = "http://news.sc5.io/";
    const char *url = "http://192.168.10.7:5000/";
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

#define MSG_RESPONSE 1
#define MSG_ERROR 2
#define MSG_TITLE 3
#define MSG_BLOCKTAG 4
#define MSG_TABLETAG 5
#define MSG_TEXTTAG 6
#define MSG_LINKTAG 7
#define MSG_ENDRESPONSE 8

static void received_callback(DictionaryIterator *iterator, void *context) {
  //unsigned char *p = (unsigned char *)iterator;
  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Received response: %p / %p (%lu) %02x%02x%02x%02x",
  //  iterator, context, dict_size(iterator), p[0], p[1], p[2], p[3]);

  Tuple *response;
  if ((response = dict_find(iterator, MSG_RESPONSE)) && response->type == TUPLE_CSTRING) {
    // Start receiving response
    blockcount = 0;
    textcount = 0;
    tablecount = 0;
    linkcount = 0;
    strcpy(textbuf, response->value->cstring);
    text_layer_set_text(text_layer, textbuf);
    strcpy(textbuf2, "Receiving...");
    text_layer_set_text(text_layer2, textbuf2);
    strcpy(textbuf3, "");
    text_layer_set_text(text_layer3, textbuf3);
    //APP_LOG(APP_LOG_LEVEL_DEBUG, "Response: %s", response->value->cstring);
  } else if ((response = dict_find(iterator, MSG_ERROR)) && response->type == TUPLE_CSTRING) {
    strcpy(textbuf, response->value->cstring);
    text_layer_set_text(text_layer, textbuf);
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Error: %s", response->value->cstring);
  } else if ((response = dict_find(iterator, MSG_TITLE)) && response->type == TUPLE_CSTRING) {
    strcpy(titlebuf, response->value->cstring);
    strcpy(textbuf, response->value->cstring);
    text_layer_set_text(text_layer, textbuf);
  } else if ((response = dict_find(iterator, MSG_BLOCKTAG)) && response->type == TUPLE_CSTRING) {
    blockcount++;
  } else if ((response = dict_find(iterator, MSG_TABLETAG)) && response->type == TUPLE_CSTRING) {
    tablecount++;
  } else if ((response = dict_find(iterator, MSG_TEXTTAG)) && response->type == TUPLE_CSTRING) {
    textcount++;
  } else if ((response = dict_find(iterator, MSG_LINKTAG)) && response->type == TUPLE_CSTRING) {
    linkcount++;
  } else if ((response = dict_find(iterator, MSG_ENDRESPONSE)) && response->type == TUPLE_CSTRING) {
    // Finished receiving response
    snprintf(textbuf2, 255, "%d link %d text", linkcount, textcount);
    text_layer_set_text(text_layer2, textbuf2);
    snprintf(textbuf3, 255, "%d table %d block", tablecount, blockcount);
    text_layer_set_text(text_layer3, textbuf3);
    light_enable_interaction();
  }
  /*
  for (response = dict_read_first(iterator); response != NULL; response = dict_read_next(iterator)) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Dict: %d", response->type);
  }
  */
}

static void dropped_callback(AppMessageResult reason, void *context) {
  switch (reason) {
    case APP_MSG_BUSY:
      APP_LOG(APP_LOG_LEVEL_DEBUG, "Dropped response because app busy");
      break;
    case APP_MSG_BUFFER_OVERFLOW:
      APP_LOG(APP_LOG_LEVEL_DEBUG, "Dropped response because of buffer overflow");
      break;
    default:
      APP_LOG(APP_LOG_LEVEL_DEBUG, "Dropped response because: %d", reason);
      break;
  }
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create((GRect) { .origin = { 0, 52 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer, "Web Browser");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));

  text_layer2 = text_layer_create((GRect) { .origin = { 0, 72 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer2, "Press Select");
  text_layer_set_text_alignment(text_layer2, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer2));

  text_layer3 = text_layer_create((GRect) { .origin = { 0, 92 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer3, "");
  text_layer_set_text_alignment(text_layer3, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer3));

  // AppMessage integration
  app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());
  app_message_register_inbox_received(received_callback);
  app_message_register_inbox_dropped(dropped_callback);
}

static void window_unload(Window *window) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Deregistering callbacks!");
  app_message_deregister_callbacks();
  text_layer_destroy(text_layer);
  text_layer_destroy(text_layer2);
  text_layer_destroy(text_layer3);
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
